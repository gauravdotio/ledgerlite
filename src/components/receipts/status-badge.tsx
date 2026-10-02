import { cn } from "@/lib/cn";
import type { ReceiptStatus } from "@/generated/prisma/enums";

const STYLES: Record<ReceiptStatus, [string, string]> = {
  UPLOADED: ["Needs details", "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"],
  EXTRACTED: ["Ready to review", "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"],
  FAILED: ["Couldn't read", "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"],
  CONFIRMED: ["Saved", "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"],
};

export function StatusBadge({ status }: { status: ReceiptStatus }) {
  const [label, style] = STYLES[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", style)}>{label}</span>;
}
