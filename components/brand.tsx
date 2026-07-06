import { cn } from "@/lib/utils";

/** Vyuha mark — four blocks converging: operations coming together as one system. */
export function VyuhaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.55" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" opacity="0.8" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" />
    </svg>
  );
}

export function VyuhaWordmark({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <VyuhaMark className={cn("h-5 w-5 text-primary", markClassName)} />
      <span className="font-display text-lg font-semibold tracking-tight">Vyuha OS</span>
    </span>
  );
}
