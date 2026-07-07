"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, TrendingUp, Package, Sparkles } from "lucide-react";

// The hero's signature moment: a mock Copilot processing a new order, with each
// step resolving in sequence. Loops gently; respects reduced motion (all steps
// shown at once, no loop).

const STEPS = [
  "Checked inventory — 3 × Sheesham Dining Chair available",
  "Updated stock — 23 left",
  "Created order for Ananya Reddy — ₹9,750",
  "Generated invoice INV-2026-0031",
  "Drafted customer message",
];

export function HeroPreview() {
  const [visible, setVisible] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      setVisible(STEPS.length);
      return;
    }
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      step = step >= STEPS.length ? 0 : step + 1;
      setVisible(step);
      timer = setTimeout(tick, step === 0 ? 1400 : step >= STEPS.length ? 2600 : 720);
    };
    timer = setTimeout(tick, 900);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-primary/20 via-primary/5 to-transparent blur-2xl"
      />
      <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-overlay">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
          <span className="ml-3 text-xs text-muted-foreground">Vyuha OS · Copilot</span>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-5">
          {/* Copilot conversation */}
          <div className="sm:col-span-3">
            <div className="flex justify-end">
              <div className="rounded-card rounded-tr-sm bg-ink-800 px-3.5 py-2 text-sm text-white">
                New order from Ananya Reddy — 3 Sheesham Dining Chair
              </div>
            </div>
            <div className="mt-3 flex gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-900 text-primary">
                <Sparkles className="h-3 w-3" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-pill bg-primary/10 px-2 py-0.5 text-2xs font-medium uppercase tracking-wide text-primary">
                  Processed order
                </span>
                <ol className="mt-2.5 space-y-2 border-l-2 border-border pl-3.5">
                  {STEPS.map((s, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-start gap-2 text-xs transition-all duration-300",
                        i < visible ? "opacity-100" : "opacity-0",
                        reduced && "opacity-100"
                      )}
                    >
                      <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span className="text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Live KPI cards */}
          <div className="space-y-3 sm:col-span-2">
            <div className="rounded-card border border-border bg-background p-3.5">
              <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="h-3 w-3" /> Today&apos;s revenue
              </div>
              <div className="num mt-1.5 text-2xl font-semibold">₹42,300</div>
              <div className="mt-1 text-2xs text-success">+ ₹9,750 just now</div>
            </div>
            <div className="rounded-card border border-border bg-background p-3.5">
              <div className="flex items-center gap-1.5 text-2xs uppercase tracking-wide text-muted-foreground">
                <Package className="h-3 w-3" /> Low stock
              </div>
              <div className="num mt-1.5 text-2xl font-semibold text-warning">5</div>
              <div className="mt-1 text-2xs text-muted-foreground">products need a reorder</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
