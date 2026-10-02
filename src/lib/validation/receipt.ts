import { z } from "zod";
import { parseDateOnly, todayInIndia } from "@/lib/dates";
import { PAYMENT_MODES } from "@/lib/payment-modes";
import type { ExpenseFormDefaults } from "./expense";

// The contract between us and the AI model. The model is asked to fill this
// shape; the SDK validates its answer against it. Anything it can't read
// should come back as null rather than a guess.
export const receiptExtractionSchema = z.object({
  isReceipt: z.boolean().describe("false if the image is not a bill, invoice or receipt"),
  vendor: z.string().max(120).nullable().describe("Shop or company name that issued the bill"),
  date: z.string().nullable().describe("Bill date as YYYY-MM-DD. Indian bills write dates as DD/MM/YYYY."),
  total: z.number().nonnegative().nullable().describe("Grand total paid, in rupees, including GST"),
  gstTotal: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Total GST in rupees: CGST + SGST, or IGST. 0 if the bill shows no GST."),
  gstin: z.string().max(20).nullable().describe("Seller's 15-character GSTIN, if printed"),
  paymentMode: z.enum(PAYMENT_MODES).nullable().describe("How it was paid, only if the bill says so"),
  category: z.string().nullable().describe("The best match from the provided category list, copied exactly"),
  lineItems: z
    .array(z.object({ description: z.string().max(200), amount: z.number().nullable() }))
    .max(50)
    .describe("Up to 50 line items as printed"),
  confidence: z.enum(["high", "medium", "low"]).describe("How legible and complete the bill was"),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

/**
 * Turns the model's answer into safe defaults for the review form. Anything
 * implausible is dropped, and the user still checks every field before saving.
 */
export function extractionToFormDefaults(
  data: ReceiptExtraction,
  categories: { id: string; name: string }[],
  today: string = todayInIndia(),
): ExpenseFormDefaults {
  const money = (n: number | null) => (n !== null && Number.isFinite(n) && n < 1e10 ? n.toFixed(2) : undefined);
  const date = data.date && parseDateOnly(data.date) && data.date <= today ? data.date : today;
  const category = data.category
    ? categories.find((c) => c.name.toLowerCase() === data.category!.trim().toLowerCase())
    : undefined;
  const total = money(data.total);
  let gst = money(data.gstTotal);
  if (gst && total && Number(gst) > Number(total)) gst = undefined;

  return {
    amount: total ?? "",
    gstAmount: gst ?? "0.00",
    date,
    vendor: data.vendor?.trim() ?? "",
    categoryId: category?.id ?? "",
    paymentMode: data.paymentMode ?? "UPI",
    notes: data.gstin ? `GSTIN ${data.gstin}` : "",
  };
}
