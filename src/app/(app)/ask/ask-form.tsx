"use client";

import { useActionState, useRef } from "react";
import { Alert, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { askAction, type AskState } from "./actions";

const EXAMPLES = [
  "How much did I spend last month?",
  "What were my 5 biggest expenses this month?",
  "How much GST did I pay this financial year?",
  "Am I over budget on anything?",
  "How much did I pay Sharma Wholesale Traders in the last 3 months?",
  "Compare cash and UPI spending this month",
];

export function AskForm({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState<AskState, FormData>(askAction, {});
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <input
          ref={inputRef}
          id="question"
          name="question"
          placeholder="Ask about your spending…"
          maxLength={300}
          required
          disabled={!enabled}
          defaultValue={state.question}
          className={`${inputClass} flex-1`}
        />
        <SubmitButton pendingText="Thinking…" disabled={!enabled}>
          Ask
        </SubmitButton>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((q) => (
          <Button
            key={q}
            variant="secondary"
            className="rounded-full px-3 py-1 text-xs"
            disabled={!enabled || pending}
            onClick={() => {
              if (!inputRef.current) return;
              inputRef.current.value = q;
              formRef.current?.requestSubmit();
            }}
          >
            {q}
          </Button>
        ))}
      </div>

      {pending ? (
        <p role="status" className="text-sm text-foreground/60">
          Looking through your expenses…
        </p>
      ) : state.error ? (
        <Alert>{state.error}</Alert>
      ) : state.answer ? (
        <Card aria-live="polite">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">{state.question}</p>
          <p className="whitespace-pre-line leading-relaxed">{state.answer}</p>
          {state.lookups?.length ? (
            <p className="mt-3 text-xs text-foreground/50">Checked: {state.lookups.join(", ")}</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
