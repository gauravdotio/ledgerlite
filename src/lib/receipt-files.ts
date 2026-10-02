// Upload rules for receipt images, shared by the browser and the server.

export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024; // 4 MB, under Vercel's 4.5 MB body limit
export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number];

export const EXTENSIONS: Record<ReceiptMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Detects the real file type from its first bytes ("magic numbers"). The
 * browser-supplied type and file name are just claims and can be faked, so
 * the server trusts only this.
 */
export function sniffImageType(bytes: Uint8Array): ReceiptMimeType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}
