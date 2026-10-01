import "server-only";
import { db } from "@/lib/db";
import { monthRange, parseDateOnly } from "@/lib/dates";
import type { ExpenseFilters, ExpenseInput } from "@/lib/validation/expense";
import { Prisma } from "@/generated/prisma/client";

// Data access for expenses. Every function takes userId and puts it in the
// WHERE clause, so one user can never read or change another user's rows,
// even if they guess an id.

export const PAGE_SIZE = 25;

export function buildExpenseWhere(
  userId: string,
  filters: Omit<ExpenseFilters, "page">,
): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = { userId };
  if (filters.month && filters.month !== "all") {
    const { start, end } = monthRange(filters.month);
    where.date = { gte: start, lt: end };
  }
  if (filters.category) where.categoryId = filters.category;
  if (filters.mode) where.paymentMode = filters.mode;
  if (filters.q) {
    where.OR = [
      { vendor: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return where;
}

export async function listExpenses(userId: string, filters: ExpenseFilters) {
  const where = buildExpenseWhere(userId, filters);
  const [items, totals] = await Promise.all([
    db.expense.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.expense.aggregate({ where, _sum: { amount: true, gstAmount: true }, _count: true }),
  ]);
  return {
    items,
    count: totals._count,
    totalAmount: totals._sum.amount,
    totalGst: totals._sum.gstAmount,
    pageCount: Math.max(1, Math.ceil(totals._count / PAGE_SIZE)),
  };
}

export function getExpense(userId: string, id: string) {
  return db.expense.findFirst({ where: { id, userId } });
}

function toData(input: ExpenseInput) {
  return {
    amount: input.amount,
    gstAmount: input.gstAmount,
    // Already validated by the schema, so this can't be null here.
    date: parseDateOnly(input.date)!,
    vendor: input.vendor,
    categoryId: input.categoryId,
    paymentMode: input.paymentMode,
    notes: input.notes,
  };
}

export function createExpense(
  userId: string,
  input: ExpenseInput,
  receiptId?: string,
  tx: Prisma.TransactionClient = db,
) {
  return tx.expense.create({ data: { ...toData(input), userId, receiptId: receiptId ?? null } });
}

export function updateExpense(userId: string, id: string, input: ExpenseInput) {
  // `userId` in the where clause: updating someone else's expense finds
  // nothing and throws P2025 instead of silently succeeding.
  return db.expense.update({ where: { id, userId }, data: toData(input) });
}

/**
 * Deletes an expense. If it came from a receipt, that receipt goes back to
 * "ready to review" so it can be saved again, instead of claiming to be saved.
 */
export function deleteExpense(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({ where: { id, userId }, select: { receiptId: true } });
    if (!expense) return;
    await tx.expense.delete({ where: { id, userId } });
    if (expense.receiptId) {
      const receipt = await tx.receipt.findFirst({
        where: { id: expense.receiptId, userId },
        select: { extractedData: true },
      });
      await tx.receipt.update({
        where: { id: expense.receiptId, userId },
        data: { status: receipt?.extractedData ? "EXTRACTED" : "UPLOADED" },
      });
    }
  });
}

/** Known Prisma errors we turn into friendly messages. */
export function isForeignKeyError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}
export function isNotFoundError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
