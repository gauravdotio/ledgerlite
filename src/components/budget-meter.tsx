import { cn } from "@/lib/cn";
import { formatINRWhole } from "@/lib/money";

// Status is never shown by colour alone: every meter also has a text label.
export function budgetStatus(ratio: number, paceRatio: number) {
  if (ratio > 1) return { label: "Over budget", icon: "▲", bar: "bg-red-600 dark:bg-red-500", text: "text-red-700 dark:text-red-400" };
  // "Close" = 90%+ used, or spending ahead of the calendar (e.g. 70% used by day 10).
  if (ratio >= 0.9 || (ratio >= 0.5 && ratio > paceRatio + 0.15)) {
    return { label: "Close to limit", icon: "●", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" };
  }
  return { label: "On track", icon: "✓", bar: "bg-brand", text: "text-foreground/60" };
}

export function BudgetMeter({
  name,
  spent,
  limit,
  paceRatio,
}: {
  name: string;
  spent: number;
  limit: number;
  /** Share of the month elapsed (0..1), drawn as a tick so you can see pace. */
  paceRatio: number;
}) {
  const ratio = spent / limit;
  const status = budgetStatus(ratio, paceRatio);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{name}</span>
        <span className="tabular text-foreground/70">
          {formatINRWhole(spent)} <span className="text-foreground/50">of {formatINRWhole(limit)}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${name} budget used`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={spent}
        aria-valuetext={`${Math.round(ratio * 100)}% used, ${status.label}`}
        title={`${Math.round(ratio * 100)}% of budget used`}
        className="relative h-2.5 rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", status.bar)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        {paceRatio > 0 && paceRatio < 1 ? (
          <div
            aria-hidden
            className="absolute -top-0.5 h-3.5 w-0.5 rounded bg-foreground/40"
            style={{ left: `${paceRatio * 100}%` }}
          />
        ) : null}
      </div>
      <p className={cn("mt-1 text-xs", status.text)}>
        <span aria-hidden>{status.icon} </span>
        {status.label} · {Math.round(ratio * 100)}%
        {ratio > 1 ? ` (${formatINRWhole(spent - limit)} over)` : ` (${formatINRWhole(limit - spent)} left)`}
      </p>
    </div>
  );
}
