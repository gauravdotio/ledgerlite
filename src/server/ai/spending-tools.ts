import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseDateOnly } from "@/lib/dates";
import { toNumber } from "@/lib/money";
import { PAYMENT_MODES } from "@/lib/payment-modes";
import { Prisma } from "@/generated/prisma/client";
import { getBudgetOverview } from "../budgets";

// Read-only tools the AI can call to answer questions. Security model:
// - The model never writes SQL. It can only fill these typed parameters.
// - userId comes from the session via the closure below, never from the
//   model, so a prompt like "show me other users' data" has no way to work.
// - Results are capped so one question can't pull the whole database.

const MAX_RANGE_DAYS = 3 * 366;

const dateRange = {
  from: z.string().describe("Start date, inclusive, YYYY-MM-DD"),
  to: z.string().describe("End date, inclusive, YYYY-MM-DD"),
};

function parseRange(from: string, to: string) {
  const start = parseDateOnly(from);
  const endInclusive = parseDateOnly(to);
  if (!start || !endInclusive || endInclusive < start) return { error: "Invalid date range. Use YYYY-MM-DD." } as const;
  const end = new Date(endInclusive.getTime() + 86_400_000);
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_RANGE_DAYS) {
    return { error: "Date range too long; use at most 3 years." } as const;
  }
  return { start, end } as const;
}

export function createSpendingTools(userId: string) {
  // Category names the model passes are matched case-insensitively to ids.
  async function categoryIdFor(name: string | undefined) {
    if (!name) return undefined;
    const category = await db.category.findFirst({
      where: { userId, name: { equals: name.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    return category?.id ?? null;
  }

  return {
    spendingSummary: tool({
      description:
        "Total spending, GST and number of expenses in a date range, optionally filtered and grouped. Use for any 'how much' question.",
      inputSchema: z.object({
        ...dateRange,
        groupBy: z.enum(["none", "category", "vendor", "paymentMode", "month"]),
        category: z.string().optional().describe("Exact category name to filter by"),
        vendorContains: z.string().optional().describe("Filter vendors whose name contains this text"),
        paymentMode: z.enum(PAYMENT_MODES).optional(),
      }),
      async execute({ from, to, groupBy, category, vendorContains, paymentMode }) {
        const range = parseRange(from, to);
        if ("error" in range) return range;
        const categoryId = await categoryIdFor(category);
        if (categoryId === null) return { error: `No category named "${category}".` };

        const where: Prisma.ExpenseWhereInput = {
          userId,
          date: { gte: range.start, lt: range.end },
          ...(categoryId ? { categoryId } : {}),
          ...(paymentMode ? { paymentMode } : {}),
          ...(vendorContains ? { vendor: { contains: vendorContains, mode: "insensitive" } } : {}),
        };

        if (groupBy === "none") {
          const r = await db.expense.aggregate({ where, _sum: { amount: true, gstAmount: true }, _count: true });
          return { total: toNumber(r._sum.amount), gst: toNumber(r._sum.gstAmount), count: r._count };
        }

        if (groupBy === "month") {
          // Bound parameters only; the filters are rebuilt as SQL fragments.
          const rows = await db.$queryRaw<{ key: string; total: Prisma.Decimal; gst: Prisma.Decimal; count: bigint }[]>`
            SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS key,
                   SUM("amount") AS total, SUM("gstAmount") AS gst, COUNT(*) AS count
            FROM "expenses"
            WHERE "userId" = ${userId} AND "date" >= ${range.start} AND "date" < ${range.end}
              ${categoryId ? Prisma.sql`AND "categoryId" = ${categoryId}` : Prisma.empty}
              ${paymentMode ? Prisma.sql`AND "paymentMode"::text = ${paymentMode}` : Prisma.empty}
              ${vendorContains ? Prisma.sql`AND "vendor" ILIKE ${"%" + vendorContains.replace(/[%_\\]/g, "\\$&") + "%"}` : Prisma.empty}
            GROUP BY 1 ORDER BY 1`;
          return rows.map((r) => ({ month: r.key, total: toNumber(r.total), gst: toNumber(r.gst), count: Number(r.count) }));
        }

        const field = groupBy === "category" ? "categoryId" : groupBy;
        const rows = await db.expense.groupBy({
          by: [field],
          where,
          _sum: { amount: true, gstAmount: true },
          _count: true,
          orderBy: { _sum: { amount: "desc" } },
          take: 20,
        });
        const names =
          groupBy === "category"
            ? new Map(
                (await db.category.findMany({ where: { userId }, select: { id: true, name: true } })).map((c) => [c.id, c.name]),
              )
            : null;
        return rows.map((r) => ({
          [groupBy]: names ? names.get(r.categoryId) : r[field as "vendor" | "paymentMode"],
          total: toNumber(r._sum.amount),
          gst: toNumber(r._sum.gstAmount),
          count: r._count,
        }));
      },
    }),

    findExpenses: tool({
      description: "List individual expenses (largest first) to answer 'which', 'biggest' or 'show me' questions.",
      inputSchema: z.object({
        ...dateRange,
        category: z.string().optional(),
        vendorContains: z.string().optional(),
        minAmount: z.number().nonnegative().optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      async execute({ from, to, category, vendorContains, minAmount, limit }) {
        const range = parseRange(from, to);
        if ("error" in range) return range;
        const categoryId = await categoryIdFor(category);
        if (categoryId === null) return { error: `No category named "${category}".` };
        const expenses = await db.expense.findMany({
          where: {
            userId,
            date: { gte: range.start, lt: range.end },
            ...(categoryId ? { categoryId } : {}),
            ...(vendorContains ? { vendor: { contains: vendorContains, mode: "insensitive" } } : {}),
            ...(minAmount !== undefined ? { amount: { gte: minAmount } } : {}),
          },
          orderBy: { amount: "desc" },
          take: limit,
          select: { date: true, vendor: true, amount: true, gstAmount: true, paymentMode: true, category: { select: { name: true } } },
        });
        return expenses.map((e) => ({
          date: e.date.toISOString().slice(0, 10),
          vendor: e.vendor,
          category: e.category.name,
          amount: toNumber(e.amount),
          gst: toNumber(e.gstAmount),
          paymentMode: e.paymentMode,
        }));
      },
    }),

    budgetStatus: tool({
      description: "Monthly budget limits and how much of each has been spent in a given month.",
      inputSchema: z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).describe("YYYY-MM") }),
      async execute({ month }) {
        const rows = await getBudgetOverview(userId, month);
        return rows
          .filter((r) => r.limit !== null)
          .map((r) => ({ category: r.name, limit: r.limit, spent: r.spent, percentUsed: Math.round((r.ratio ?? 0) * 100) }));
      },
    }),
  };
}
