import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { env, features } from "@/lib/env";
import { EXTENSIONS, type ReceiptMimeType } from "@/lib/receipt-files";

// Where receipt images live. On Vercel: a PRIVATE Vercel Blob store, so a
// leaked URL is useless without our token. Images are only ever served
// through /api/receipts/[id]/image, which checks the user owns the receipt.
// Locally without a Blob token: files in ./.local/uploads, so the app works
// with zero setup. (Vercel's filesystem is read-only, so production needs Blob.)

const LOCAL_ROOT = path.join(process.cwd(), ".local", "uploads");
const LOCAL_PREFIX = "local:";

export type StoredFile = { url: string; pathname: string };

export async function saveReceiptImage(
  userId: string,
  bytes: Uint8Array,
  mimeType: ReceiptMimeType,
): Promise<StoredFile> {
  // Random name: never use the user's file name in a path.
  const pathname = `receipts/${userId}/${randomUUID()}.${EXTENSIONS[mimeType]}`;

  if (features.blobStorage) {
    const blob = await put(pathname, Buffer.from(bytes), {
      access: "private",
      contentType: mimeType,
      token: env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  if (env.NODE_ENV === "production") {
    throw new Error("BLOB_READ_WRITE_TOKEN is required in production to store receipts.");
  }
  const file = path.join(LOCAL_ROOT, pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return { url: `${LOCAL_PREFIX}${pathname}`, pathname };
}

export async function readReceiptImage(
  stored: StoredFile,
): Promise<{ body: ReadableStream<Uint8Array> | Uint8Array; contentType?: string } | null> {
  if (stored.url.startsWith(LOCAL_PREFIX)) {
    const file = path.join(LOCAL_ROOT, stored.pathname);
    // Defence in depth against path traversal ("../../etc/passwd").
    if (!file.startsWith(LOCAL_ROOT + path.sep)) return null;
    try {
      return { body: new Uint8Array(await readFile(file)) };
    } catch {
      return null;
    }
  }
  const result = await get(stored.url, { access: "private", token: env.BLOB_READ_WRITE_TOKEN });
  if (!result || result.statusCode !== 200) return null;
  return { body: result.stream, contentType: result.blob.contentType };
}

/** Reads the whole image into memory (for sending to the AI model). */
export async function readReceiptBytes(stored: StoredFile): Promise<Uint8Array | null> {
  const file = await readReceiptImage(stored);
  if (!file) return null;
  if (file.body instanceof Uint8Array) return file.body;
  return new Uint8Array(await new Response(file.body).arrayBuffer());
}

export async function deleteReceiptImage(stored: StoredFile): Promise<void> {
  if (stored.url.startsWith(LOCAL_PREFIX)) {
    await rm(path.join(LOCAL_ROOT, stored.pathname), { force: true });
    return;
  }
  await del(stored.url, { token: env.BLOB_READ_WRITE_TOKEN });
}
