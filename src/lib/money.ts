// Money helpers. Prisma returns Decimal(12,2) columns as Decimal objects, not
// numbers, so we never do float maths on rupees by accident. Numbers are only
// used at the very end, for display and chart sizes.

type DecimalLike = { toString(): string };

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWholeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function toNumber(value: DecimalLike | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

/** Formats as Indian rupees with lakh/crore grouping, e.g. ₹1,23,456.00 */
export function formatINR(value: DecimalLike | number | null | undefined): string {
  return inrFormatter.format(toNumber(value));
}

/** Rounded, for dashboards: ₹1,23,456 */
export function formatINRWhole(value: DecimalLike | number | null | undefined): string {
  return inrWholeFormatter.format(toNumber(value));
}

/** Accepts "1,234.5", "₹ 1234", "1234.50" and returns "1234.50", or null if invalid. */
export function normaliseAmount(input: string): string | null {
  const cleaned = input.replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
}
