"use client";

import { useTransition } from "react";
import { Button } from "./button";

/** Asks "are you sure?" and then runs a server action (e.g. delete). */
export function ConfirmButton({
  action,
  confirmText,
  children,
  pendingText = "Deleting…",
}: {
  action: () => Promise<void>;
  confirmText: string;
  children: React.ReactNode;
  pendingText?: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      className="px-2 py-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmText)) startTransition(() => action());
      }}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
