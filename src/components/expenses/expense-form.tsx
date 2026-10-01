"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState, type FormState } from "@/lib/form";
import { PAYMENT_MODE_LABELS, PAYMENT_MODES } from "@/lib/payment-modes";
import type { ExpenseFormDefaults } from "@/lib/validation/expense";


type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  categories: { id: string; name: string }[];
  defaults: ExpenseFormDefaults;
  maxDate: string;
  submitLabel: string;
  cancelHref: string;
};

/**
 * One form for "add", "edit" and "confirm receipt". The parent passes the
 * server action, so this component doesn't know which one it is.
 */
export function ExpenseForm({ action, categories, defaults, maxDate, submitLabel, cancelHref }: Props) {
  const [state, formAction] = useActionState(action, initialFormState);
  // After a failed submit, show what the user typed rather than the originals.
  const v = { ...defaults, ...state.values } as ExpenseFormDefaults;
  const e = state.errors ?? {};

  return (
    <form key={state.nonce} action={formAction} className="grid gap-4 sm:grid-cols-2">
      {state.message ? <Alert className="sm:col-span-2">{state.message}</Alert> : null}

      <Field label="Total amount (₹)" name="amount" error={e["amount"]} hint="Including GST">
        <Input
          name="amount"
          inputMode="decimal"
          placeholder="1250.00"
          required
          defaultValue={v.amount}
          error={e["amount"]}
        />
      </Field>
      <Field label="GST included (₹)" name="gstAmount" error={e["gstAmount"]} hint="CGST + SGST, or IGST. 0 if none.">
        <Input
          name="gstAmount"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={v.gstAmount}
          error={e["gstAmount"]}
        />
      </Field>
      <Field label="Paid to" name="vendor" error={e["vendor"]}>
        <Input
          name="vendor"
          placeholder="Sharma Wholesale Traders"
          required
          maxLength={120}
          defaultValue={v.vendor}
          error={e["vendor"]}
        />
      </Field>
      <Field label="Date" name="date" error={e["date"]}>
        <Input name="date" type="date" required max={maxDate} defaultValue={v.date} error={e["date"]} />
      </Field>
      <Field label="Category" name="categoryId" error={e["categoryId"]}>
        <Select name="categoryId" required defaultValue={v.categoryId ?? ""} error={e["categoryId"]}>
          <option value="" disabled>
            Choose…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Paid by</legend>
        <div className="flex gap-2">
          {PAYMENT_MODES.map((mode) => (
            <label
              key={mode}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/10 has-[:checked]:text-brand"
            >
              <input
                type="radio"
                name="paymentMode"
                value={mode}
                required
                defaultChecked={(v.paymentMode ?? "UPI") === mode}
                className="sr-only"
              />
              {PAYMENT_MODE_LABELS[mode]}
            </label>
          ))}
        </div>
        {e["paymentMode"] ? <p className="text-xs text-red-600">{e["paymentMode"][0]}</p> : null}
      </fieldset>
      <Field label="Notes (optional)" name="notes" error={e["notes"]} className="sm:col-span-2">
        <Textarea name="notes" rows={2} maxLength={500} defaultValue={v.notes} error={e["notes"]} />
      </Field>

      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
