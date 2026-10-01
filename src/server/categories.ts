import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient | typeof db;

/** Gives a new user the starter categories. Safe to call twice. */
export async function createDefaultCategories(userId: string, tx: Tx = db) {
  await tx.category.createMany({
    data: DEFAULT_CATEGORIES.map((name) => ({ userId, name })),
    skipDuplicates: true,
  });
}

export function listCategories(userId: string) {
  return db.category.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
