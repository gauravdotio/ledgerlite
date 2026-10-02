import type { Metadata } from "next";
import { Alert, Card, PageHeader } from "@/components/ui/card";
import { ReceiptUploader } from "@/components/receipts/receipt-uploader";
import { features } from "@/lib/env";
import { requireUserId } from "@/server/auth/session";
import { uploadReceiptAction } from "../actions";

export const metadata: Metadata = { title: "Scan receipt" };

export default async function NewReceiptPage() {
  await requireUserId();
  return (
    <>
      <PageHeader title="Scan a receipt" description="Flat on a table, in good light, the whole bill in frame." />
      <Card className="max-w-xl">
        {!features.ai ? (
          <Alert tone="info" className="mb-4">
            AI reading is switched off (no Gemini key set). You can still upload and type the details yourself.
          </Alert>
        ) : null}
        <ReceiptUploader action={uploadReceiptAction} aiEnabled={features.ai} />
      </Card>
    </>
  );
}
