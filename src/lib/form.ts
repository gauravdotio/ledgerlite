import { z } from "zod";

// The shape every server action returns to its form via useActionState.
// `values` echoes what the user typed, because React resets uncontrolled
// forms after an action runs and we don't want to wipe their input on error.
export type FormState = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
  // Unique per response. Forms use it as their React `key`, so after an error
  // the form remounts with `values` as fresh defaults. (React 19 resets forms
  // after an action, and a reset <select> otherwise loses its value.)
  nonce?: string;
};

export const initialFormState: FormState = {};

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    // Skip Next.js internals ($ACTION_...) and never echo passwords back into the HTML.
    if (typeof value !== "string" || key.startsWith("$") || key.toLowerCase().includes("password")) {
      continue;
    }
    values[key] = value;
  }
  return values;
}

/** Echo the submitted values back, with a fresh nonce. */
export function echo(formData: FormData): Pick<FormState, "values" | "nonce"> {
  return { values: formValues(formData), nonce: crypto.randomUUID() };
}

export function invalid(error: z.ZodError, formData: FormData, message?: string): FormState {
  return {
    errors: z.flattenError(error).fieldErrors as Record<string, string[]>,
    ...echo(formData),
    message: message ?? "Please fix the highlighted fields.",
  };
}
