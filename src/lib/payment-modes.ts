// Client-safe copy of the PaymentMode enum. The generated Prisma enum file is
// fine to import too, but this keeps labels next to the values.
export const PAYMENT_MODES = ["CASH", "UPI", "CARD"] as const;
export type PaymentModeValue = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentModeValue, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
};
