import "server-only";
import { db } from "@/lib/db";
import { receiptExtractionSchema } from "@/lib/validation/receipt";
import type { ReceiptMimeType } from "@/lib/receipt-files";
import type { ExpenseInput } from "@/lib/validation/expense";
import { Prisma, ReceiptStatus } from "@/generated/prisma/client";
import { extractReceipt } from "./ai/extract-receipt";
import { listCategories } from "./categories";
import { createExpense } from "./expenses";
import { deleteReceiptImage, readReceiptBytes, saveReceiptImage } from "./storage";

/**
 * "Saved" is true only if an expense actually links to the receipt. Rows
 * changed outside the app (bulk deletes, scripts) can't leave a receipt
 * claiming CONFIRMED with nothing behind it.
 */
function withEffectiveStatus<T extends { status: ReceiptStatus; extractedData: Prisma.JsonValue; expense: unknown }>(
  receipt: T,
): T {
  if (receipt.status === ReceiptStatus.CONFIRMED && !receipt.expense) {
    return { ...receipt, status: receipt.extractedData ? ReceiptStatus.EXTRACTED : ReceiptStatus.UPLOADED };
  }
  return receipt;
}

export async function listReceipts(userId: string) {
  const receipts = await db.receipt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { expense: { select: { id: true, vendor: true, amount: true } } },
  });
  return receipts.map(withEffectiveStatus);
}

export async function getReceipt(userId: string, id: string) {
  const receipt = await db.receipt.findFirst({
    where: { id, userId },
    include: { expense: { select: { id: true, vendor: true, amount: true } } },
  });
  return receipt ? withEffectiveStatus(receipt) : null;
}

/** Stores the image and creates the Receipt row (status UPLOADED). */
export async function createReceipt(userId: string, bytes: Uint8Array, mimeType: ReceiptMimeType) {
  const stored = await saveReceiptImage(userId, bytes, mimeType);
  return db.receipt.create({
    data: {
      userId,
      blobUrl: stored.url,
      blobPathname: stored.pathname,
      mimeType,
      sizeBytes: bytes.byteLength,
    },
  });
}

/** Runs the AI and records EXTRACTED (with data) or FAILED (with a reason). */
export async function runExtraction(userId: string, receiptId: string) {
  const receipt = await getReceipt(userId, receiptId);
  if (!receipt || receipt.status === ReceiptStatus.CONFIRMED) return;

  const [bytes, categories] = await Promise.all([
    readReceiptBytes({ url: receipt.blobUrl, pathname: receipt.blobPathname }),
    listCategories(userId),
  ]);
  const result = bytes
    ? await extractReceipt(bytes, receipt.mimeType, categories.map((c) => c.name))
    : ({ ok: false, error: "The image file is missing." } as const);

  await db.receipt.update({
    where: { id: receipt.id, userId },
    data: result.ok
      ? { status: ReceiptStatus.EXTRACTED, extractedData: result.data, errorMessage: null }
      : { status: ReceiptStatus.FAILED, errorMessage: result.error },
  });
}

/** Re-validates stored JSON before use. Old rows may predate a schema change. */
export function parseExtractedData(value: Prisma.JsonValue | null) {
  const parsed = receiptExtractionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Saves the reviewed expense and marks the receipt CONFIRMED in one
 * transaction, so we never get an expense without its receipt link or a
 * receipt marked confirmed without an expense.
 */
export async function confirmReceipt(userId: string, receiptId: string, input: ExpenseInput) {
  return db.$transaction(async (tx) => {
    // Re-check inside the transaction: guards against a double submit.
    const receipt = await tx.receipt.findFirst({
      where: { id: receiptId, userId },
      select: { expense: { select: { id: true } } },
    });
    if (!receipt) throw new Error("Receipt not found");
    if (receipt.expense) return null; // already saved (e.g. double-click)

    const expense = await createExpense(userId, input, receiptId, tx);
    await tx.receipt.update({ where: { id: receiptId, userId }, data: { status: ReceiptStatus.CONFIRMED } });
    return expense;
  });
}

/** Deletes the receipt row and its image. A linked expense is kept (its receiptId becomes null). */
export async function deleteReceipt(userId: string, receiptId: string) {
  const receipt = await db.receipt.findFirst({ where: { id: receiptId, userId } });
  if (!receipt) return;
  await db.receipt.delete({ where: { id: receipt.id, userId } });
  // Delete the file after the row: a leftover file is harmless, a row pointing
  // at a missing file is a broken page.
  await deleteReceiptImage({ url: receipt.blobUrl, pathname: receipt.blobPathname }).catch((error) =>
    console.error("Failed to delete receipt image", error),
  );
}
