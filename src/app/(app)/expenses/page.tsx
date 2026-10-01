import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { inputClass } from "@/components/ui/field";
import { currentMonth, formatDate, formatMonth, shiftMonth } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { PAYMENT_MODE_LABELS, PAYMENT_MODES } from "@/lib/payment-modes";
import { firstValues } from "@/lib/search-params";
import { expenseFiltersSchema } from "@/lib/validation/expense";
import { requireUserId } from "@/server/auth/session";
import { listCategories } from "@/server/categories";
import { listExpenses } from "@/server/expenses";
import { deleteExpenseAction } from "./actions";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const userId = await requireUserId();
  const raw = firstValues(await searchParams);
  const parsed = expenseFiltersSchema.parse(raw);
  const filters = { ...parsed, month: parsed.month ?? currentMonth() };

  const [result, categories] = await Promise.all([
    listExpenses(userId, filters),
    listCategories(userId),
  ]);

  // Builds a link to this page with some filters changed and the rest kept.
  const hrefWith = (changes: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, page: undefined, ...changes };
    for (const [key, value] of Object.entries(merged)) {
      if (value === undefined || value === "" || (key === "page" && Number(value) === 1)) continue;
      params.set(key, String(value));
    }
    return `/expenses?${params}`;
  };
  const exportParams = new URLSearchParams(
    Object.entries({ month: filters.month, category: filters.category, mode: filters.mode, q: filters.q }).filter(
      (entry): entry is [string, string] => Boolean(entry[1]),
    ),
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        description={filters.month === "all" ? "All time" : formatMonth(filters.month)}
        actions={
          <>
            <a href={`/api/expenses/export?${exportParams}`} className={buttonClass("secondary")}>
              Export CSV
            </a>
            <ButtonLink href="/expenses/new">Add expense</ButtonLink>
          </>
        }
      />

      {raw["saved"] ? <Alert tone="success" className="mb-4">Expense saved.</Alert> : null}

      {/* A plain GET form: filters live in the URL, so they work without
          JavaScript and can be bookmarked or shared. */}
      <form className="mb-4 grid gap-2 sm:grid-cols-[auto_1fr_1fr_1fr_auto]" action="/expenses">
        <div className="flex items-center gap-1">
          {filters.month !== "all" ? (
            <Link
              href={hrefWith({ month: shiftMonth(filters.month, -1) })}
              className={buttonClass("ghost", "px-2")}
              aria-label="Previous month"
            >
              ‹
            </Link>
          ) : null}
          <input
            type="month"
            name="month"
            aria-label="Month"
            defaultValue={filters.month === "all" ? "" : filters.month}
            className={inputClass}
          />
          {filters.month !== "all" ? (
            <Link
              href={hrefWith({ month: shiftMonth(filters.month, 1) })}
              className={buttonClass("ghost", "px-2")}
              aria-label="Next month"
            >
              ›
            </Link>
          ) : null}
        </div>
        <select name="category" aria-label="Category" defaultValue={filters.category ?? ""} className={inputClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="mode" aria-label="Payment mode" defaultValue={filters.mode ?? ""} className={inputClass}>
          <option value="">Cash, UPI and card</option>
          {PAYMENT_MODES.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_MODE_LABELS[m]}
            </option>
          ))}
        </select>
        <input
          type="search"
          name="q"
          placeholder="Search vendor or notes"
          defaultValue={filters.q ?? ""}
          className={inputClass}
        />
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("secondary")}>
            Filter
          </button>
          <Link href={hrefWith({ month: "all", category: undefined, mode: undefined, q: undefined })} className={buttonClass("ghost")}>
            All time
          </Link>
        </div>
      </form>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Spent" value={formatINR(result.totalAmount)} />
        <Stat label="GST paid" value={formatINR(result.totalGst)} />
        <Stat label="Entries" value={String(result.count)} />
      </div>

      {result.items.length === 0 ? (
        <Card className="text-center text-sm text-foreground/60">
          No expenses here yet.{" "}
          <Link href="/expenses/new" className="font-medium text-brand hover:underline">
            Add one
          </Link>{" "}
          or{" "}
          <Link href="/receipts/new" className="font-medium text-brand hover:underline">
            scan a receipt
          </Link>
          .
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-border">
            {result.items.map((expense) => (
              <li key={expense.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{expense.vendor}</p>
                  <p className="text-xs text-foreground/60">
                    {formatDate(expense.date)} · {expense.category.name} · {PAYMENT_MODE_LABELS[expense.paymentMode]}
                    {expense.receiptId ? " · 🧾 receipt" : ""}
                  </p>
                </div>
                <div className="tabular text-right">
                  <p className="font-semibold">{formatINR(expense.amount)}</p>
                  {expense.gstAmount.gt(0) ? (
                    <p className="text-xs text-foreground/60">GST {formatINR(expense.gstAmount)}</p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Link href={`/expenses/${expense.id}/edit`} className={buttonClass("ghost", "px-2 py-1")}>
                    Edit
                  </Link>
                  <ConfirmButton
                    action={deleteExpenseAction.bind(null, expense.id)}
                    confirmText={`Delete ${expense.vendor} (${formatINR(expense.amount)})?`}
                  >
                    Delete
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between text-sm">
          {filters.page > 1 ? (
            <Link href={hrefWith({ page: filters.page - 1 })} className={buttonClass("secondary")}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-foreground/60">
            Page {filters.page} of {result.pageCount}
          </span>
          {filters.page < result.pageCount ? (
            <Link href={hrefWith({ page: filters.page + 1 })} className={buttonClass("secondary")}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="tabular mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
