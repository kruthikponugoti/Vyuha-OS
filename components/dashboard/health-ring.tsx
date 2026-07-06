import { cn } from "@/lib/utils";

export function HealthRing({
  score,
  breakdown,
}: {
  score: number;
  breakdown: { label: string; score: number; weight: number }[];
}) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const tone = score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
  const stroke = { success: "hsl(var(--success))", warning: "hsl(var(--warning))", danger: "hsl(var(--destructive))" }[tone];
  const label = score >= 75 ? "Healthy" : score >= 50 ? "Needs attention" : "At risk";

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 112 112" className="h-full w-full -rotate-90">
          <circle cx="56" cy="56" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
          <circle
            cx="56" cy="56" r={r} fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-3xl font-semibold">{score}</span>
          <span className="text-2xs uppercase tracking-wide text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="w-full flex-1">
        <div
          className={cn(
            "inline-flex rounded-pill px-2.5 py-0.5 text-xs font-medium",
            tone === "success" && "bg-success-soft text-success",
            tone === "warning" && "bg-warning-soft text-warning",
            tone === "danger" && "bg-destructive-soft text-destructive"
          )}
        >
          {label}
        </div>
        <div className="mt-3 space-y-2.5">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{b.label}</span>
                <span className="num font-medium">{b.score}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    b.score >= 75 ? "bg-success" : b.score >= 50 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${b.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
