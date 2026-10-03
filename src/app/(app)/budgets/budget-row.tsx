"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState, type FormState } from "@/lib/form";

export function BudgetForm({
  action,
  name,
  limit,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  name: string;
  limit: number | null;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const error = state.errors?.["monthlyLimit"]?.[0];
  return (
    <form key={state.nonce} action={formAction} className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`limit-${name}`}>
        Monthly limit for {name}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-foreground/50">₹</span>
        <input
          id={`limit-${name}`}
          name="monthlyLimit"
          inputMode="decimal"
          placeholder="No limit"
          defaultValue={state.values?.["monthlyLimit"] ?? (limit !== null ? String(limit) : "")}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} w-32 pl-7`}
        />
      </div>
      <SubmitButton variant="secondary" pendingText="…">
        Save
      </SubmitButton>
      {error ? (
        <span className="text-xs text-red-600">{error}</span>
      ) : state.message ? (
        <span className="text-xs text-foreground/60" role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
