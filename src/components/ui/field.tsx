import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-foreground/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-red-500";

type FieldProps = {
  label: string;
  name: string;
  error?: string[] | undefined;
  hint?: ReactNode;
  className?: string;
  children?: ReactNode;
};

/**
 * Label + control + error message, wired together for screen readers
 * (aria-invalid and aria-describedby point at the error text).
 */
export function Field({ label, name, error, hint, className, children }: FieldProps) {
  const errorId = `${name}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error?.length ? <p className="text-xs text-foreground/60">{hint}</p> : null}
      {error?.length ? (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  name,
  error,
  className,
  ...props
}: ComponentProps<"input"> & { name: string; error?: string[] | undefined }) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? `${name}-error` : undefined}
      className={cn(inputClass, className)}
      {...props}
    />
  );
}

export function Select({
  name,
  error,
  className,
  ...props
}: ComponentProps<"select"> & { name: string; error?: string[] | undefined }) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? `${name}-error` : undefined}
      className={cn(inputClass, className)}
      {...props}
    />
  );
}

export function Textarea({
  name,
  error,
  className,
  ...props
}: ComponentProps<"textarea"> & { name: string; error?: string[] | undefined }) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={error?.length ? true : undefined}
      aria-describedby={error?.length ? `${name}-error` : undefined}
      className={cn(inputClass, className)}
      {...props}
    />
  );
}
