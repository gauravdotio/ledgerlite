import type { Metadata } from "next";
import { Alert, PageHeader } from "@/components/ui/card";
import { features } from "@/lib/env";
import { requireUserId } from "@/server/auth/session";
import { AskForm } from "./ask-form";

export const metadata: Metadata = { title: "Ask" };

export default async function AskPage() {
  await requireUserId();
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Ask about your spending"
        description="Plain questions, answered from your own records. The AI looks up the numbers; it never guesses them."
      />
      {!features.ai ? (
        <Alert tone="info" className="mb-4">
          Add a free Gemini API key (GOOGLE_GENERATIVE_AI_API_KEY) to turn this on.
        </Alert>
      ) : null}
      <AskForm enabled={features.ai} />
    </div>
  );
}
