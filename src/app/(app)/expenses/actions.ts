"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echo, invalid, type FormState } from "@/lib/form";
import { expenseSchema } from "@/lib/validation/expense";
import { requireUserId } from "@/server/auth/session";
import {
  createExpense,
  deleteExpense,
  isForeignKeyError,
  isNotFoundError,
  updateExpense,
} from "@/server/expenses";

// Server actions are public HTTP endpoints: anyone can call them with any
// data. So each one re-checks the session and re-validates input on the
// server, no matter what the form in the browser already checked.

function afterChange() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
}

export async function createExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  try {
    await createExpense(userId, parsed.data);
  } catch (error) {
    // The composite foreign key rejects a category id that isn't this user's.
    if (isForeignKeyError(error)) {
      return { errors: { categoryId: ["Pick one of your categories"] }, ...echo(formData) };
    }
    throw error;
  }
  afterChange();
  redirect("/expenses?saved=1");
}

export async function updateExpenseAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  try {
    await updateExpense(userId, id, parsed.data);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return { errors: { categoryId: ["Pick one of your categories"] }, ...echo(formData) };
    }
    if (isNotFoundError(error)) return { message: "This expense no longer exists." };
    throw error;
  }
  afterChange();
  redirect("/expenses?saved=1");
}

export async function deleteExpenseAction(id: string) {
  const userId = await requireUserId();
  await deleteExpense(userId, id);
  afterChange();
}
