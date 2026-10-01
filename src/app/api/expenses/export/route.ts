import { auth } from "@/auth";
import { db } from "@/lib/db";
import { currentMonth, toDateInput } from "@/lib/dates";
import { toCsv } from "@/lib/csv";
import { PAYMENT_MODE_LABELS } from "@/lib/payment-modes";
import { expenseFiltersSchema } from "@/lib/validation/expense";
import { buildExpenseWhere } from "@/server/expenses";

// GET /api/expenses/export?month=2026-10 -> a CSV for the accountant.
// Route handlers aren't covered by the proxy matcher, so check auth here.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = expenseFiltersSchema.parse(params);
  const filters = { ...parsed, month: parsed.month ?? currentMonth() };

  const expenses = await db.expense.findMany({
    where: buildExpenseWhere(session.user.id, filters),
    include: { category: { select: { name: true } } },
    orderBy: { date: "asc" },
    take: 10_000,
  });

  const csv = toCsv([
    ["Date", "Vendor", "Category", "Payment mode", "Amount (INR)", "GST (INR)", "Notes"],
    ...expenses.map((e) => [
      toDateInput(e.date),
      e.vendor,
      e.category.name,
      PAYMENT_MODE_LABELS[e.paymentMode],
      e.amount.toFixed(2),
      e.gstAmount.toFixed(2),
      e.notes,
    ]),
  ]);

  // The BOM makes Excel open the file as UTF-8, so ₹ and Hindi text survive.
  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledgerlite-${filters.month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
