"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

// The signature moment: multi-step actions resolve in sequence with a quiet
// checkmark. Respects prefers-reduced-motion (all steps shown at once).

export interface Step {
  label: string;
  status: "done" | "failed";
}

function Marker({ failed }: { failed: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full animate-checkPop ${
        failed ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"
      }`}
    >
      {failed ? <X className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
    </span>
  );
}

export function StepTrace({
  steps,
  animate = true,
  onComplete,
}: {
  steps: Step[];
  animate?: boolean;
  onComplete?: () => void;
}) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [visible, setVisible] = React.useState(animate && !reduced ? 0 : steps.length);
  const done = React.useRef(false);

  React.useEffect(() => {
    if (visible >= steps.length) {
      if (!done.current) {
        done.current = true;
        onComplete?.();
      }
      return;
    }
    const t = setTimeout(() => setVisible((v) => v + 1), visible === 0 ? 220 : 560);
    return () => clearTimeout(t);
  }, [visible, steps.length, onComplete]);

  return (
    <ol className="mt-3 space-y-2.5 border-l-2 border-border pl-4" aria-label="Steps completed">
      {steps.slice(0, visible).map((step, i) => (
        <li key={i} className="flex items-start gap-2.5 animate-stepIn">
          <Marker failed={step.status === "failed"} />
          <span className="text-sm text-muted-foreground">{step.label}</span>
        </li>
      ))}
      {visible < steps.length && (
        <li className="flex items-center gap-2.5" aria-hidden>
          <span className="flex h-[18px] w-[18px] items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulseDot" />
          </span>
          <span className="text-sm text-muted-foreground/70">Working…</span>
        </li>
      )}
    </ol>
  );
}
