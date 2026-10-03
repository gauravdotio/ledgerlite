"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState, type FormState } from "@/lib/form";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function AddCategoryForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initialFormState);
  const error = state.errors?.["name"]?.[0];
  return (
    <form key={state.nonce} action={formAction} className="flex flex-wrap items-start gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="new-category" className="sr-only">
          New category name
        </label>
        <input
          id="new-category"
          name="name"
          placeholder="e.g. Shop rent"
          maxLength={40}
          required
          defaultValue={state.values?.["name"]}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} w-56`}
        />
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </div>
      <SubmitButton pendingText="Adding…">Add category</SubmitButton>
      {!error && state.message ? (
        <span role="status" className="self-center text-sm text-foreground/60">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

export function CategoryRow({
  name,
  count,
  rename,
  remove,
}: {
  name: string;
  count: number;
  rename: Action;
  remove: (state: FormState) => Promise<FormState>;
}) {
  const [renameState, renameAction] = useActionState(rename, initialFormState);
  const [removeState, removeAction, removing] = useActionState(remove, initialFormState);
  const error = renameState.errors?.["name"]?.[0];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form key={renameState.nonce} action={renameAction} className="flex flex-1 flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`cat-${name}`}>
            Category name
          </label>
          <input
            id={`cat-${name}`}
            name="name"
            defaultValue={renameState.values?.["name"] ?? name}
            maxLength={40}
            required
            aria-invalid={error ? true : undefined}
            className={`${inputClass} w-56`}
          />
          <SubmitButton variant="secondary" pendingText="…">
            Rename
          </SubmitButton>
          <span className="text-xs text-foreground/60">
            {count} expense{count === 1 ? "" : "s"}
          </span>
        </form>
        <form
          action={removeAction}
          onSubmit={(event) => {
            if (!window.confirm(`Delete the category “${name}”?`)) event.preventDefault();
          }}
        >
          <Button
            type="submit"
            variant="ghost"
            disabled={removing}
            className="px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            {removing ? "Deleting…" : "Delete"}
          </Button>
        </form>
      </div>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {removeState.message ? <Alert>{removeState.message}</Alert> : null}
    </div>
  );
}
