"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { echo, invalid, type FormState } from "@/lib/form";
import { features } from "@/lib/env";
import { MAX_RECEIPT_BYTES, sniffImageType } from "@/lib/receipt-files";
import { expenseSchema } from "@/lib/validation/expense";
import { requireUserId } from "@/server/auth/session";
import { isForeignKeyError } from "@/server/expenses";
import { confirmReceipt, createReceipt, deleteReceipt, runExtraction } from "@/server/receipts";

export async function uploadReceiptAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Choose a photo of the receipt first." };
  if (file.size > MAX_RECEIPT_BYTES) return { message: "That image is over 4 MB. Try a smaller photo." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the bytes, not file.type, which the browser (or an attacker) sets.
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { message: "Only JPEG, PNG or WebP images are supported." };

  const receipt = await createReceipt(userId, bytes, mimeType);
  // Runs inline (5-15 s). Fine for one photo at a time; a queue would be the
  // next step for bulk uploads.
  if (features.ai) await runExtraction(userId, receipt.id);

  revalidatePath("/receipts");
  redirect(`/receipts/${receipt.id}`);
}

export async function retryExtractionAction(receiptId: string) {
  const userId = await requireUserId();
  await runExtraction(userId, receiptId);
  revalidatePath(`/receipts/${receiptId}`);
}

export async function confirmReceiptAction(
  receiptId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await requireUserId();
  const parsed = expenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  try {
    await confirmReceipt(userId, receiptId, parsed.data);
  } catch (error) {
    if (isForeignKeyError(error)) {
      return { errors: { categoryId: ["Pick one of your categories"] }, ...echo(formData) };
    }
    throw error;
  }
  revalidatePath("/receipts");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  redirect("/expenses?saved=1");
}

export async function deleteReceiptAction(receiptId: string) {
  const userId = await requireUserId();
  await deleteReceipt(userId, receiptId);
  revalidatePath("/receipts");
  redirect("/receipts");
}
