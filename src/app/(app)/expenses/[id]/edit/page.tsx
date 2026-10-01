import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { toDateInput, todayInIndia } from "@/lib/dates";
import { requireUserId } from "@/server/auth/session";
import { listCategories } from "@/server/categories";
import { getExpense } from "@/server/expenses";
import { updateExpenseAction } from "../../actions";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditExpensePage({ params }: PageProps<"/expenses/[id]/edit">) {
  const { id } = await params;
  const userId = await requireUserId();
  const [expense, categories] = await Promise.all([getExpense(userId, id), listCategories(userId)]);
  // Someone else's id looks exactly like a missing one: no information leaks.
  if (!expense) notFound();

  return (
    <>
      <PageHeader title="Edit expense" />
      <Card className="max-w-2xl">
        <ExpenseForm
          action={updateExpenseAction.bind(null, expense.id)}
          categories={categories}
          defaults={{
            amount: expense.amount.toFixed(2),
            gstAmount: expense.gstAmount.toFixed(2),
            date: toDateInput(expense.date),
            vendor: expense.vendor,
            categoryId: expense.categoryId,
            paymentMode: expense.paymentMode,
            notes: expense.notes ?? "",
          }}
          maxDate={todayInIndia()}
          submitLabel="Save changes"
          cancelHref="/expenses"
        />
      </Card>
    </>
  );
}
