import "server-only";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/dates";
import { toNumber } from "@/lib/money";

export type BudgetRow = {
  categoryId: string;
  name: string;
  spent: number;
  limit: number | null;
  /** spent / limit, e.g. 0.8 = 80% used. Null when there's no budget. */
  ratio: number | null;
};

/** Every category with what was spent in `month` and its budget, if any. */
export async function getBudgetOverview(userId: string, month: string): Promise<BudgetRow[]> {
  const { start, end } = monthRange(month);
  const [categories, spending] = await Promise.all([
    db.category.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, budget: { select: { monthlyLimit: true } } },
    }),
    // One GROUP BY query instead of one query per category.
    db.expense.groupBy({
      by: ["categoryId"],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  const spentBy = new Map(spending.map((s) => [s.categoryId, toNumber(s._sum.amount)]));
  return categories.map((c) => {
    const spent = spentBy.get(c.id) ?? 0;
    const limit = c.budget ? toNumber(c.budget.monthlyLimit) : null;
    return { categoryId: c.id, name: c.name, spent, limit, ratio: limit ? spent / limit : null };
  });
}

export async function setBudget(userId: string, categoryId: string, monthlyLimit: string | null) {
  if (monthlyLimit === null) {
    await db.budget.deleteMany({ where: { userId, categoryId } });
    return;
  }
  await db.budget.upsert({
    where: { categoryId_userId: { categoryId, userId } },
    create: { userId, categoryId, monthlyLimit },
    update: { monthlyLimit },
  });
}

export function listCategoriesWithCounts(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, _count: { select: { expenses: true } } },
  });
}
