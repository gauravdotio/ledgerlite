import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/receipts/status-badge";
import { formatDate } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { requireUserId } from "@/server/auth/session";
import { listReceipts } from "@/server/receipts";

export const metadata: Metadata = { title: "Receipts" };

export default async function ReceiptsPage() {
  const userId = await requireUserId();
  const receipts = await listReceipts(userId);

  return (
    <>
      <PageHeader
        title="Receipts"
        description="Photos of your bills. Unsaved ones are waiting for you to check."
        actions={<ButtonLink href="/receipts/new">Scan receipt</ButtonLink>}
      />
      {receipts.length === 0 ? (
        <Card className="text-center text-sm text-foreground/60">
          No receipts yet.{" "}
          <Link href="/receipts/new" className="font-medium text-brand hover:underline">
            Scan your first bill
          </Link>
          .
        </Card>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {receipts.map((r) => (
            <li key={r.id}>
              <Link
                href={`/receipts/${r.id}`}
                className="block overflow-hidden rounded-xl border border-border bg-surface hover:border-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image route */}
                <img
                  src={`/api/receipts/${r.id}/image`}
                  alt=""
                  loading="lazy"
                  className="aspect-[3/4] w-full bg-muted object-cover"
                />
                <div className="flex flex-col gap-1 p-3">
                  <StatusBadge status={r.status} />
                  <p className="truncate text-sm font-medium">
                    {r.expense ? `${r.expense.vendor} · ${formatINR(r.expense.amount)}` : "Not saved yet"}
                  </p>
                  <p className="text-xs text-foreground/60">Uploaded {formatDate(r.createdAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
