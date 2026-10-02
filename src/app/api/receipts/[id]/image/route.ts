import { auth } from "@/auth";
import { db } from "@/lib/db";
import { readReceiptImage } from "@/server/storage";

// Streams a receipt image to its owner. Blobs are private, so this route is
// the only way to see one, and it checks ownership on every request.
export async function GET(_request: Request, { params }: RouteContext<"/api/receipts/[id]/image">) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const receipt = await db.receipt.findFirst({
    where: { id, userId: session.user.id },
    select: { blobUrl: true, blobPathname: true, mimeType: true },
  });
  if (!receipt) return new Response("Not found", { status: 404 });

  const file = await readReceiptImage({ url: receipt.blobUrl, pathname: receipt.blobPathname });
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.body as BodyInit, {
    headers: {
      "Content-Type": receipt.mimeType,
      // No caching at all: shop phones are often shared, and a cached bill
      // would still be visible after the owner signs out.
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'",
    },
  });
}
