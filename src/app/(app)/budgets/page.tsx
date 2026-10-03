import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/card";
import { BudgetMeter } from "@/components/budget-meter";
import { currentMonth, formatMonth, monthProgress } from "@/lib/dates";
import { formatINRWhole } from "@/lib/money";
import { requireUserId } from "@/server/auth/session";
import { getBudgetOverview } from "@/server/budgets";
import { setBudgetAction } from "../categories/actions";
import { BudgetForm } from "./budget-row";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const userId = await requireUserId();
  const month = currentMonth();
  const rows = await getBudgetOverview(userId, month);
  const { daysElapsed, daysInMonth } = monthProgress(month);
  const pace = daysElapsed / daysInMonth;

  const budgeted = rows.filter((r) => r.limit !== null);
  const totalLimit = budgeted.reduce((sum, r) => sum + (r.limit ?? 0), 0);
  const totalSpent = budgeted.reduce((sum, r) => sum + r.spent, 0);

  return (
    <>
      <PageHeader
        title="Budgets"
        description={`Monthly limits per category. Showing ${formatMonth(month)}, day ${daysElapsed} of ${daysInMonth}.`}
      />
      {budgeted.length > 0 ? (
        <Card className="mb-6">
          <BudgetMeter name="All budgeted categories" spent={totalSpent} limit={totalLimit} paceRatio={pace} />
          <p className="mt-2 text-xs text-foreground/50">
            The small tick marks how far through the month we are. A bar past the tick means spending is ahead of pace.
          </p>
        </Card>
      ) : null}
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.categoryId} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              {row.limit !== null ? (
                <BudgetMeter name={row.name} spent={row.spent} limit={row.limit} paceRatio={pace} />
              ) : (
                <div className="text-sm">
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-foreground/60">
                    No budget · {formatINRWhole(row.spent)} spent this month
                  </p>
                </div>
              )}
              <BudgetForm action={setBudgetAction.bind(null, row.categoryId)} name={row.name} limit={row.limit} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
