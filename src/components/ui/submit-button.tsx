"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./button";

/** A submit button that disables itself and shows `pendingText` while its form submits. */
export function SubmitButton({
  children,
  pendingText = "Saving…",
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
