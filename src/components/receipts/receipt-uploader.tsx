"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { Alert } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { initialFormState, type FormState } from "@/lib/form";
import { MAX_RECEIPT_BYTES } from "@/lib/receipt-files";

const MAX_SIDE = 1600; // px: plenty for the AI to read small print
const JPEG_QUALITY = 0.85;

/**
 * Shrinks the photo in the browser before upload. A 12 MP phone photo
 * (4-8 MB) becomes ~300 KB: faster on mobile data, under Vercel's body limit,
 * cheaper to send to the AI, and re-encoding drops EXIF metadata such as the
 * GPS location of the shop.
 */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))), "image/jpeg", JPEG_QUALITY),
  );
}

export function ReceiptUploader({
  action,
  aiEnabled,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  aiEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Free the preview's object URL when it changes or the component unmounts.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  async function onChoose(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo (JPEG, PNG or WebP).");
      return;
    }
    try {
      const small = await shrinkImage(file);
      if (small.size > MAX_RECEIPT_BYTES) throw new Error("too big");
      setImage(small);
      setPreview(URL.createObjectURL(small));
    } catch {
      setError("Couldn't open that image. Try a JPEG or PNG photo.");
    }
  }

  function upload() {
    if (!image) return;
    const formData = new FormData();
    formData.set("file", image, "receipt.jpg");
    startTransition(() => formAction(formData));
  }

  const message = error ?? state.message;

  return (
    <div className="flex flex-col gap-4">
      {message ? <Alert>{message}</Alert> : null}

      <label
        className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/50 p-4 text-center hover:border-brand"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void onChoose(event.dataTransfer.files[0]);
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: URL, nothing to optimise
          <img src={preview} alt="Receipt preview" className="max-h-96 rounded-lg object-contain" />
        ) : (
          <>
            <span className="text-3xl" aria-hidden>
              🧾
            </span>
            <span className="font-medium">Take a photo or choose an image</span>
            <span className="text-xs text-foreground/60">On a phone this opens the camera. JPEG, PNG or WebP.</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture="environment"
          className="sr-only"
          onChange={(event) => void onChoose(event.target.files?.[0])}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={upload} disabled={!image || pending}>
          {pending ? (aiEnabled ? "Reading receipt…" : "Uploading…") : aiEnabled ? "Upload and read" : "Upload"}
        </Button>
        {image && !pending ? (
          <Button
            variant="ghost"
            onClick={() => {
              setImage(null);
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            Choose another
          </Button>
        ) : null}
      </div>
      {pending && aiEnabled ? (
        <p className="text-sm text-foreground/60" role="status">
          The AI is reading the vendor, date, total and GST. This takes 5–15 seconds.
        </p>
      ) : null}
    </div>
  );
}
