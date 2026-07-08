// Server-side data access — HYBRID.
//
// The app supports two modes at once, decided per request:
//   • Real mode  — a Supabase project is configured AND this request is not a
//     demo session. Reads/writes go to Postgres through the cookie-bound SSR
//     client, so Row Level Security (auth.uid()) is enforced.
//   • Demo mode  — no Supabase configured, OR the request carries the
//     `vyuha-demo-auth` cookie (the landing-page role picker). Reads/writes go
//     to the seeded in-memory store.
// Both clients expose the same query API (see local-client.ts), so callers
// never branch on mode.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LocalClient, LocalDatabase } from "./local-client";
import { buildSeedDatabase, BIZ_ID } from "./seed";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accepts the classic anon key or the new-format publishable key (either works
// in the public client position); whichever is set in the environment.
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when a Supabase project is configured at all (env present and not a placeholder). */
export const supabaseConfigured = Boolean(
  url && 
  anonKey && 
  url.startsWith("http") && 
  !anonKey.startsWith("sb_publishable_") && 
  anonKey.startsWith("eyJ")
);

/**
 * Back-compat alias. Historically this meant "use Supabase". Now it only means
 * "Supabase is configured"; whether a given request actually uses it is decided
 * by isDemoRequest(). Prefer isDemoRequest()/realMode() in new code.
 */
export const usingSupabase = supabaseConfigured;

export const DEMO_BUSINESS_ID = BIZ_ID;
export const DEMO_AUTH_COOKIE = "vyuha-demo-auth";
export const DEMO_ROLE_COOKIE = "vyuha-demo-role";

/**
 * Is the current request a demo session? True when the demo-auth cookie is
 * explicitly present (role picker selected). Never falls back to true for real
 * requests even if Supabase is not configured (which instead triggers an error).
 */
export function isDemoRequest(): boolean {
  try {
    return Boolean(cookies().get(DEMO_AUTH_COOKIE));
  } catch {
    // Fall back to checking configuration if cookies() cannot be accessed (e.g. static generation)
    return !supabaseConfigured;
  }
}

/** Convenience inverse. */
export function realMode(): boolean {
  return !isDemoRequest();
}

type G = typeof globalThis & {
  __vyuhaDb?: LocalDatabase;
  __vyuhaVersion?: Record<string, number>;
};

const g = globalThis as G;

function localDb(): LocalDatabase {
  if (!g.__vyuhaDb) {
    g.__vyuhaDb = buildSeedDatabase();
    g.__vyuhaVersion = {};
  }
  return g.__vyuhaDb;
}

function bumpVersion(table: string) {
  if (!g.__vyuhaVersion) g.__vyuhaVersion = {};
  g.__vyuhaVersion[table] = (g.__vyuhaVersion[table] ?? 0) + 1;
  g.__vyuhaVersion.__all = (g.__vyuhaVersion.__all ?? 0) + 1;
}

/** Monotonic change counter — demo mode's stand-in for Realtime. */
export function dataVersion(): number {
  localDb();
  return g.__vyuhaVersion?.__all ?? 0;
}

/** Cookie-bound Supabase client so RLS sees the authenticated user. */
function supabaseRequestClient() {
  const store = cookies();
  return createServerClient(url!, anonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component — middleware refreshes the session
        }
      },
    },
  });
}

export function getDb(): SupabaseClient | LocalClient {
  if (realMode()) {
    if (!supabaseConfigured) {
      const errorMsg = !url || !anonKey 
        ? "Supabase configuration is missing in real mode. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
        : !url.startsWith("http")
          ? `Supabase URL is invalid: "${url}". It must start with http/https.`
          : anonKey.startsWith("sb_publishable_")
            ? "Placeholder publishable key (sb_publishable_...) detected. Vyuha OS requires a valid Supabase anon key in real mode."
            : "Supabase API key is invalid (must be a valid JWT starting with 'ey'). Please check your configuration.";
      throw new Error(errorMsg);
    }
    return supabaseRequestClient();
  }
  return new LocalClient(localDb(), bumpVersion);
}

/** Reset the demo store to the pristine seed (used by the demo-reset action). */
export function resetDemoData() {
  g.__vyuhaDb = buildSeedDatabase();
  g.__vyuhaVersion = { __all: (g.__vyuhaVersion?.__all ?? 0) + 1 };
  return true;
}
