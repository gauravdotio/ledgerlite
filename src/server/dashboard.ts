import "server-only";
import { db } from "@/lib/db";
import { monthProgress, monthRange, shiftMonth } from "@/lib/dates";
import { toNumber } from "@/lib/money";
import { Prisma } from "@/generated/prisma/client";
import { getBudgetOverview } from "./budgets";

export const TREND_MONTHS = 6;

/** Everything the dashboard shows for one month, fetched in parallel. */
export async function getDashboard(userId: string, month: string) {
  const { start, end } = monthRange(month);
  const prev = monthRange(shiftMonth(month, -1));
  // Compare like with like: on 5 Oct, compare with 1-5 Sep, not all of September.
  const { daysElapsed, daysInMonth } = monthProgress(month);
  const partial = daysElapsed < daysInMonth;
  const prevEnd = partial
    ? new Date(Math.min(prev.start.getTime() + daysElapsed * 86_400_000, prev.end.getTime()))
    : prev.end;
  const trendStart = monthRange(shiftMonth(month, -(TREND_MONTHS - 1))).start;
  const inMonth = { userId, date: { gte: start, lt: end } };

  const [totals, prevTotals, byMode, byVendor, trendRows, budgets, pendingReceipts] = await Promise.all([
    db.expense.aggregate({ where: inMonth, _sum: { amount: true, gstAmount: true }, _count: true }),
    db.expense.aggregate({ where: { userId, date: { gte: prev.start, lt: prevEnd } }, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["paymentMode"], where: inMonth, _sum: { amount: true } }),
    db.expense.groupBy({
      by: ["vendor"],
      where: inMonth,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    // Prisma's groupBy can't group by "month of date", so this one is SQL.
    // The tagged template turns ${...} into bound parameters ($1, $2...), so
    // it is not open to SQL injection.
    db.$queryRaw<{ month: string; total: Prisma.Decimal }[]>`
      SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month, SUM("amount") AS total
      FROM "expenses"
      WHERE "userId" = ${userId} AND "date" >= ${trendStart} AND "date" < ${end}
      GROUP BY 1
      ORDER BY 1`,
    getBudgetOverview(userId, month),
    // Waiting for review = no expense saved from it yet.
    db.receipt.count({ where: { userId, expense: null } }),
  ]);

  // Fill months with no spending with 0, so the chart has no gaps.
  const trendBy = new Map(trendRows.map((r) => [r.month, toNumber(r.total)]));
  const trend = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const m = shiftMonth(month, i - (TREND_MONTHS - 1));
    return { month: m, total: trendBy.get(m) ?? 0 };
  });

  const total = toNumber(totals._sum.amount);
  const prevTotal = toNumber(prevTotals._sum.amount);

  return {
    total,
    gst: toNumber(totals._sum.gstAmount),
    count: totals._count,
    prevTotal,
    change: prevTotal > 0 ? (total - prevTotal) / prevTotal : null,
    /** True when `change` compares only the first N days of each month. */
    comparesPartialMonth: partial,
    byCategory: budgets
      .filter((b) => b.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .map((b) => ({ id: b.categoryId, label: b.name, value: b.spent })),
    byMode: byMode.map((m) => ({ mode: m.paymentMode, value: toNumber(m._sum.amount) })),
    topVendors: byVendor.map((v) => ({ label: v.vendor, value: toNumber(v._sum.amount), count: v._count })),
    trend,
    budgets: budgets.filter((b) => b.limit !== null),
    pendingReceipts,
  };
}
