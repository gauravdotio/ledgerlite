import { cn } from "@/lib/cn";
import { formatINRWhole } from "@/lib/money";

// Dependency-free charts in HTML/CSS. Every chart here is a single series, so
// one hue (brand teal) does the job and no colour legend is needed. Values are
// printed as text next to each bar, so nothing depends on colour or hover.

type Bar = { id?: string; label: string; value: number; sublabel?: string };

/** Horizontal bars, largest first. Good for "where did the money go". */
export function BarList({ data, total, emptyText = "Nothing yet." }: { data: Bar[]; total?: number; emptyText?: string }) {
  if (data.length === 0) return <p className="text-sm text-foreground/60">{emptyText}</p>;
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => {
        const share = total ? ` · ${Math.round((d.value / total) * 100)}%` : "";
        return (
          <li key={d.id ?? d.label} title={`${d.label}: ${formatINRWhole(d.value)}${share}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">
                {d.label}
                {d.sublabel ? <span className="text-xs text-foreground/50"> · {d.sublabel}</span> : null}
              </span>
              <span className="tabular shrink-0 font-medium">
                {formatINRWhole(d.value)}
                {share ? <span className="text-xs font-normal text-foreground/50">{share}</span> : null}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${max > 0 ? Math.max((d.value / max) * 100, 1.5) : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Vertical columns over time, with the selected month emphasised. */
export function ColumnChart({
  data,
  highlight,
  formatLabel,
}: {
  data: { key: string; value: number }[];
  highlight: string;
  formatLabel: (key: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure>
      <div className="flex h-44 items-end gap-2" aria-hidden>
        {data.map((d) => {
          const active = d.key === highlight;
          return (
            <div
              key={d.key}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={`${formatLabel(d.key)}: ${formatINRWhole(d.value)}`}
            >
              {/* Direct label only on the highlighted month, to keep it quiet. */}
              {active ? (
                <span className="tabular mb-1 text-center text-xs font-semibold">{formatINRWhole(d.value)}</span>
              ) : (
                <span className="tabular mb-1 text-center text-xs opacity-0 group-hover:opacity-100">
                  {formatINRWhole(d.value)}
                </span>
              )}
              <div
                className={cn("rounded-t-md transition-colors", active ? "bg-brand" : "bg-brand/35 group-hover:bg-brand/60")}
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-border pt-1" aria-hidden>
        {data.map((d) => (
          <span
            key={d.key}
            className={cn("flex-1 text-center text-xs", d.key === highlight ? "font-semibold" : "text-foreground/60")}
          >
            {formatLabel(d.key)}
          </span>
        ))}
      </div>
      {/* The same numbers as a real table, for screen readers. */}
      <table className="sr-only">
        <caption>Monthly spending</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Spent</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{formatLabel(d.key)}</th>
              <td>{formatINRWhole(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
