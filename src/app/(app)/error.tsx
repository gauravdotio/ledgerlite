"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Shown when something on a signed-in page throws. Error details stay in
// the server logs; users get a short message and a retry button.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-md text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Your data is safe. Try again, and if it keeps happening, reload the page.
        {error.digest ? <span className="mt-2 block text-xs">Reference: {error.digest}</span> : null}
      </p>
      <Button className="mt-4" onClick={reset}>
        Try again
      </Button>
    </Card>
  );
}
