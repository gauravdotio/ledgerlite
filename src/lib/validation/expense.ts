import { z } from "zod";
import { normaliseAmount } from "@/lib/money";
import { parseDateOnly, todayInIndia } from "@/lib/dates";
import { PAYMENT_MODES } from "@/lib/payment-modes";

const MAX_AMOUNT = 99_99_99_999.99; // fits Decimal(12, 2)

// Amounts stay strings ("1234.50") all the way to Prisma, which turns them
// into exact Decimals. Parsing to a JS number would reintroduce float errors.
const rupees = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .transform((value, ctx) => {
      const amount = normaliseAmount(value);
      if (amount === null || Number(amount) > MAX_AMOUNT) {
        ctx.addIssue({ code: "custom", message: `Enter the ${label} like 1250 or 1250.50` });
        return z.NEVER;
      }
      return amount;
    });

export const expenseSchema = z
  .object({
    amount: rupees("amount").refine((v) => Number(v) > 0, "Amount must be more than ₹0"),
    gstAmount: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : "0"))
      .pipe(rupees("GST amount")),
    date: z
      .string()
      .trim()
      .refine((v) => parseDateOnly(v) !== null, "Pick a valid date")
      // A day of slack, in case the server clock's "today" is behind the user's.
      .refine((v) => v <= nextDay(todayInIndia()), "Date can't be in the future"),
    vendor: z.string().trim().min(1, "Enter who you paid").max(120),
    categoryId: z.string().trim().min(1, "Pick a category"),
    paymentMode: z.enum(PAYMENT_MODES, { error: "Pick how you paid" }),
    notes: z
      .string()
      .trim()
      .max(500, "Keep notes under 500 characters")
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((e) => Number(e.gstAmount) <= Number(e.amount), {
    message: "GST can't be more than the total amount",
    path: ["gstAmount"],
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;

/** Initial values for the expense form (all strings, as in the HTML inputs). */
export type ExpenseFormDefaults = {
  amount?: string;
  gstAmount?: string;
  date?: string;
  vendor?: string;
  categoryId?: string;
  paymentMode?: string;
  notes?: string;
};

function nextDay(date: string): string {
  const d = parseDateOnly(date) ?? new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Filters for the expenses list, parsed from the URL (?month=2026-10&category=...).
// Anything invalid is dropped instead of erroring, since people edit URLs.
export const expenseFiltersSchema = z.object({
  // "all" means no date filter; missing means the current month.
  month: z
    .union([z.literal("all"), z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)])
    .optional()
    .catch(undefined),
  category: z.string().max(40).optional().catch(undefined),
  mode: z.enum(PAYMENT_MODES).optional().catch(undefined),
  q: z.string().trim().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).default(1).catch(1),
});

export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
