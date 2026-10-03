"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { echo, invalid, type FormState } from "@/lib/form";
import { budgetSchema, categoryNameSchema } from "@/lib/validation/category";
import { requireUserId } from "@/server/auth/session";
import { setBudget } from "@/server/budgets";
import { isForeignKeyError, isNotFoundError } from "@/server/expenses";
import { Prisma } from "@/generated/prisma/client";

function isUniqueError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * The database's unique (userId, name) is case-sensitive, so "packaging" and
 * "Packaging" would both be allowed. Check case-insensitively first. (A rare
 * race between two tabs could still slip through; that's an acceptable cost
 * here versus a raw-SQL expression index Prisma can't model.)
 */
async function nameTaken(userId: string, name: string, exceptId?: string) {
  const match = await db.category.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" }, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    select: { id: true },
  });
  return match !== null;
}

function afterChange() {
  revalidatePath("/categories");
  revalidatePath("/budgets");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}

export async function addCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = categoryNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  if (await nameTaken(userId, parsed.data.name)) {
    return { errors: { name: ["You already have this category"] }, ...echo(formData) };
  }
  try {
    await db.category.create({ data: { userId, name: parsed.data.name } });
  } catch (error) {
    if (isUniqueError(error)) return { errors: { name: ["You already have this category"] }, ...echo(formData) };
    throw error;
  }
  afterChange();
  return { message: `Added “${parsed.data.name}”.`, nonce: crypto.randomUUID() };
}

export async function renameCategoryAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = categoryNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  if (await nameTaken(userId, parsed.data.name, id)) {
    return { errors: { name: ["You already have this category"] }, ...echo(formData) };
  }
  try {
    await db.category.update({ where: { id, userId }, data: { name: parsed.data.name } });
  } catch (error) {
    if (isUniqueError(error)) return { errors: { name: ["You already have this category"] }, ...echo(formData) };
    // Ids passed with .bind() come back from the browser and can be tampered
    // with; the userId in the WHERE makes a foreign id simply "not found".
    if (isNotFoundError(error)) return { message: "That category no longer exists." };
    throw error;
  }
  afterChange();
  return { message: "Renamed.", nonce: crypto.randomUUID() };
}

export async function deleteCategoryAction(id: string, _prev: FormState): Promise<FormState> {
  const userId = await requireUserId();
  const inUse = await db.expense.count({ where: { userId, categoryId: id } });
  if (inUse > 0) {
    return { message: `This category has ${inUse} expense${inUse === 1 ? "" : "s"}. Move them to another category first.` };
  }
  try {
    await db.category.delete({ where: { id, userId } });
  } catch (error) {
    // Backstop: onDelete: Restrict makes Postgres refuse if an expense was
    // added between the count above and this delete.
    if (isForeignKeyError(error)) {
      return { message: "This category still has expenses. Move them to another category first." };
    }
    if (isNotFoundError(error)) return {};
    throw error;
  }
  afterChange();
  return {};
}

export async function setBudgetAction(categoryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = budgetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);
  try {
    await setBudget(userId, categoryId, parsed.data.monthlyLimit);
  } catch (error) {
    if (isForeignKeyError(error)) return { message: "That category doesn't exist." };
    throw error;
  }
  afterChange();
  return { message: parsed.data.monthlyLimit ? "Saved" : "Removed", nonce: crypto.randomUUID() };
}
