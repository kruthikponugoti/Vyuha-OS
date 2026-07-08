"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

/**
 * Keeps a route fresh when its underlying tables change — in another tab, from
 * a Copilot action, or from a server action anywhere.
 *
 * Real mode  → subscribe to Supabase Realtime `postgres_changes` on `tables`.
 * Demo mode  → poll the monotonic `/api/version` counter (shared across tabs in
 *              the same server process) and refresh when it moves.
 *
 * The mode is decided by the *server* (via /api/version → { realtime }), not by
 * whether a browser client exists: in hybrid deployments a demo-cookie user has
 * a configured `supabaseBrowser` but their data lives in the in-memory store, so
 * Supabase would never emit events for them.
 *
 * Returns a `pulse` counter that increments on every *external* change, so the
 * caller can flash a container to make the update noticeable.
 */
export function useRealtimeRefresh(tables: string[]): number {
  const router = useRouter();
  const [pulse, setPulse] = React.useState(0);
  const key = tables.join(",");

  React.useEffect(() => {
    const list = key.split(",").filter(Boolean);
    if (list.length === 0) return;

    let cancelled = false;
    let cleanup = () => {};
    let debounce: ReturnType<typeof setTimeout> | undefined;

    // Coalesce bursts (a Copilot order touches several tables at once).
    const fire = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (cancelled) return;
        router.refresh();
        setPulse((p) => p + 1);
      }, 400);
    };

    (async () => {
      let realtime = false;
      let version = 0;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          realtime = Boolean(j.realtime);
          version = Number(j.version) || 0;
        }
      } catch {
        /* fall back to polling */
      }
      if (cancelled) return;

      if (realtime && supabaseBrowser) {
        const sb = supabaseBrowser;
        const ch = sb.channel(`rt-${key}`);
        for (const t of list) {
          ch.on("postgres_changes", { event: "*", schema: "public", table: t }, fire);
        }
        ch.subscribe();
        cleanup = () => { sb.removeChannel(ch); };
      } else {
        const iv = setInterval(async () => {
          try {
            const r = await fetch("/api/version", { cache: "no-store" });
            if (!r.ok) return;
            const j = await r.json();
            const v = Number(j.version) || 0;
            if (v !== version) { version = v; fire(); }
          } catch {
            /* ignore transient failures */
          }
        }, 3500);
        cleanup = () => clearInterval(iv);
      }
    })();

    return () => {
      cancelled = true;
      if (debounce) clearTimeout(debounce);
      cleanup();
    };
  }, [key, router]);

  return pulse;
}
