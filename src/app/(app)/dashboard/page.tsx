import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { BarList, ColumnChart } from "@/components/charts";
import { BudgetMeter } from "@/components/budget-meter";
import { currentMonth, formatMonth, isMonth, monthProgress, shiftMonth } from "@/lib/dates";
import { formatINRWhole } from "@/lib/money";
import { PAYMENT_MODE_LABELS } from "@/lib/payment-modes";
import { firstValues } from "@/lib/search-params";
import { requireUserId } from "@/server/auth/session";
import { getDashboard } from "@/server/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const userId = await requireUserId();
  const { month: rawMonth } = firstValues(await searchParams);
  const thisMonth = currentMonth();
  // Clamp to the current month: there's nothing to see in the future.
  const month = isMonth(rawMonth) && rawMonth <= thisMonth ? rawMonth : thisMonth;
  const data = await getDashboard(userId, month);
  const { daysElapsed, daysInMonth } = monthProgress(month);

  const changeText =
    data.change === null
      ? "Nothing in the same period last month to compare"
      : `${data.change >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(data.change * 100))}% vs ${
          data.comparesPartialMonth ? `the same ${daysElapsed} days of ` : ""
        }${formatMonth(shiftMonth(month, -1), "short")}`;

  return (
    <>
      <PageHeader
        title={formatMonth(month)}
        description={month === thisMonth ? `Day ${daysElapsed} of ${daysInMonth}` : "Past month"}
        actions={
          <>
            <Link href={`/dashboard?month=${shiftMonth(month, -1)}`} className={buttonClass("secondary")} aria-label="Previous month">
              ‹
            </Link>
            {month < thisMonth ? (
              <Link href={`/dashboard?month=${shiftMonth(month, 1)}`} className={buttonClass("secondary")} aria-label="Next month">
                ›
              </Link>
            ) : null}
            <ButtonLink href="/receipts/new">Scan receipt</ButtonLink>
          </>
        }
      />

      {data.pendingReceipts > 0 ? (
        <Alert tone="info" className="mb-4">
          {data.pendingReceipts} receipt{data.pendingReceipts === 1 ? " is" : "s are"} waiting for you to review.{" "}
          <Link href="/receipts" className="font-medium underline">
            Review now
          </Link>
        </Alert>
      ) : null}

      {/* Headline numbers are stat tiles, not charts. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-foreground/60">Total spent</p>
          <p className="tabular mt-1 text-3xl font-bold tracking-tight">{formatINRWhole(data.total)}</p>
          <p className="mt-1 text-xs text-foreground/60">{changeText}</p>
        </Card>
        <Card>
          <p className="text-sm text-foreground/60">GST paid</p>
          <p className="tabular mt-1 text-3xl font-bold tracking-tight">{formatINRWhole(data.gst)}</p>
          <p className="mt-1 text-xs text-foreground/60">Input tax credit you may be able to claim</p>
        </Card>
        <Card>
          <p className="text-sm text-foreground/60">Expenses recorded</p>
          <p className="tabular mt-1 text-3xl font-bold tracking-tight">{data.count}</p>
          <p className="mt-1 text-xs text-foreground/60">
            <Link href={`/expenses?month=${month}`} className="underline">
              See all
            </Link>
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Last {data.trend.length} months</h2>
          <ColumnChart
            data={data.trend.map((t) => ({ key: t.month, value: t.total }))}
            highlight={month}
            formatLabel={(m) => formatMonth(m, "short")}
          />
        </Card>

        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Budgets</h2>
            <Link href="/budgets" className="text-sm text-brand hover:underline">
              Edit
            </Link>
          </div>
          {data.budgets.length === 0 ? (
            <p className="text-sm text-foreground/60">
              No budgets yet.{" "}
              <Link href="/budgets" className="text-brand hover:underline">
                Set a monthly limit
              </Link>{" "}
              for categories like electricity or transport.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {data.budgets.map((b) => (
                <BudgetMeter
                  key={b.categoryId}
                  name={b.name}
                  spent={b.spent}
                  limit={b.limit!}
                  paceRatio={daysElapsed / daysInMonth}
                />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">By category</h2>
          <BarList data={data.byCategory} total={data.total} emptyText="No expenses this month." />
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="mb-4 font-semibold">Top vendors</h2>
            <BarList
              data={data.topVendors.map((v) => ({
                label: v.label,
                value: v.value,
                sublabel: `${v.count} bill${v.count === 1 ? "" : "s"}`,
              }))}
              emptyText="No expenses this month."
            />
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">How you paid</h2>
            <BarList
              data={data.byMode
                .sort((a, b) => b.value - a.value)
                .map((m) => ({ label: PAYMENT_MODE_LABELS[m.mode], value: m.value }))}
              total={data.total}
              emptyText="No expenses this month."
            />
          </Card>
        </div>
      </div>
    </>
  );
}
