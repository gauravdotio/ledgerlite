import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { todayInIndia } from "@/lib/dates";
import { requireUserId } from "@/server/auth/session";
import { listCategories } from "@/server/categories";
import { createExpenseAction } from "../actions";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage() {
  const userId = await requireUserId();
  const categories = await listCategories(userId);
  const today = todayInIndia();

  return (
    <>
      <PageHeader title="Add expense" description="Typing it in? Or scan a receipt from the Receipts tab." />
      <Card className="max-w-2xl">
        <ExpenseForm
          action={createExpenseAction}
          categories={categories}
          defaults={{ date: today, paymentMode: "UPI" }}
          maxDate={today}
          submitLabel="Save expense"
          cancelHref="/expenses"
        />
      </Card>
    </>
  );
}
