import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function Alert({
  tone = "error",
  className,
  ...props
}: ComponentProps<"p"> & { tone?: "error" | "success" | "info" }) {
  const tones = {
    error: "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
    success:
      "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    info: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200",
  };
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg border px-3 py-2 text-sm", tones[tone], className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-foreground/60">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
