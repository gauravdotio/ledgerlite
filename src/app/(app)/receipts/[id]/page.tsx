import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { StatusBadge } from "@/components/receipts/status-badge";
import { todayInIndia } from "@/lib/dates";
import { features } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { extractionToFormDefaults } from "@/lib/validation/receipt";
import { requireUserId } from "@/server/auth/session";
import { listCategories } from "@/server/categories";
import { getReceipt, parseExtractedData } from "@/server/receipts";
import { confirmReceiptAction, deleteReceiptAction, retryExtractionAction } from "../actions";

export const metadata: Metadata = { title: "Review receipt" };

export default async function ReceiptPage({ params }: PageProps<"/receipts/[id]">) {
  const { id } = await params;
  const userId = await requireUserId();
  const [receipt, categories] = await Promise.all([getReceipt(userId, id), listCategories(userId)]);
  if (!receipt) notFound();

  const today = todayInIndia();
  const extracted = parseExtractedData(receipt.extractedData);
  const defaults = extracted
    ? extractionToFormDefaults(extracted, categories, today)
    : { date: today, paymentMode: "UPI" };

  return (
    <>
      <PageHeader
        title="Review receipt"
        description="Check what the AI read against the photo, fix anything wrong, then save."
        actions={
          <ConfirmButton action={deleteReceiptAction.bind(null, receipt.id)} confirmText="Delete this receipt photo?">
            Delete receipt
          </ConfirmButton>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-2">
          <a href={`/api/receipts/${receipt.id}/image`} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
            <img
              src={`/api/receipts/${receipt.id}/image`}
              alt="Receipt photo"
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
          </a>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={receipt.status} />
            {extracted ? (
              <span className="text-xs text-foreground/60">AI confidence: {extracted.confidence}</span>
            ) : null}
          </div>

          {receipt.status === "CONFIRMED" ? (
            <Alert tone="success">
              Saved as an expense
              {receipt.expense ? ` (${receipt.expense.vendor}, ${formatINR(receipt.expense.amount)})` : ""}.{" "}
              {receipt.expense ? (
                <Link href={`/expenses/${receipt.expense.id}/edit`} className="font-medium underline">
                  Edit it
                </Link>
              ) : null}
            </Alert>
          ) : (
            <>
              {receipt.status === "FAILED" ? <Alert>{receipt.errorMessage}</Alert> : null}
              {receipt.status !== "EXTRACTED" && features.ai ? (
                <form action={retryExtractionAction.bind(null, receipt.id)}>
                  <SubmitButton variant="secondary" pendingText="Reading receipt…">
                    Read with AI
                  </SubmitButton>
                </form>
              ) : null}
              {extracted && extracted.lineItems.length > 0 ? (
                <details className="rounded-lg border border-border p-3 text-sm">
                  <summary className="cursor-pointer font-medium">
                    {extracted.lineItems.length} line items read
                  </summary>
                  <ul className="mt-2 divide-y divide-border">
                    {extracted.lineItems.map((item, i) => (
                      <li key={i} className="flex justify-between gap-4 py-1">
                        <span>{item.description}</span>
                        <span className="tabular">{item.amount !== null ? formatINR(item.amount) : "–"}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <ExpenseForm
                // Remount when the receipt is re-read, so the fields pick up
                // the new values (React keeps the old ones on a mounted form).
                key={receipt.updatedAt.toISOString()}
                action={confirmReceiptAction.bind(null, receipt.id)}
                categories={categories}
                defaults={defaults}
                maxDate={today}
                submitLabel="Save expense"
                cancelHref="/receipts"
              />
            </>
          )}
        </Card>
      </div>
    </>
  );
}
