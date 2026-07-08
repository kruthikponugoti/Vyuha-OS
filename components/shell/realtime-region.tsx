"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useRealtimeRefresh } from "@/components/hooks/use-realtime";

/**
 * Wraps a module view so it re-fetches when its `tables` change elsewhere (other
 * tab, Copilot action, server action) and briefly flashes to make the update
 * noticeable — reusing the same `liveFlash` cue the dashboard KPIs use.
 */
export function RealtimeRegion({
  tables,
  children,
  className,
}: {
  tables: string[];
  children: React.ReactNode;
  className?: string;
}) {
  const pulse = useRealtimeRefresh(tables);
  const [flash, setFlash] = React.useState(false);
  const first = React.useRef(true);

  React.useEffect(() => {
    if (first.current) {
      first.current = false; // don't flash on initial mount
      return;
    }
    setFlash(false);
    const raf = requestAnimationFrame(() => setFlash(true)); // restart the animation
    const t = setTimeout(() => setFlash(false), 1500);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [pulse]);

  return (
    <div className={cn("rounded-card", flash && "animate-liveFlash motion-reduce:animate-none", className)}>
      {children}
    </div>
  );
}
