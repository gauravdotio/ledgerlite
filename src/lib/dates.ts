// Date helpers. Expense dates are calendar dates (Postgres DATE), which Prisma
// represents as a JS Date at UTC midnight. So we always format and compare in
// UTC, and only use India time (IST) to decide what "today" is.

const IST = "Asia/Kolkata";
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in India as YYYY-MM-DD. (en-CA formats dates as YYYY-MM-DD.) */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(now);
}

/** The current month in India as YYYY-MM. */
export function currentMonth(now: Date = new Date()): string {
  return todayInIndia(now).slice(0, 7);
}

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_RE.test(value);
}

/** "2026-10-03" -> Date at 2026-10-03T00:00:00Z, or null if it isn't a real date. */
export function parseDateOnly(value: string): Date | null {
  if (!DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects things like 2026-02-31, which JS would silently roll over to March.
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

/** Date -> "2026-10-03" (for <input type="date"> and CSV). */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Half-open range [start, end) covering a YYYY-MM month. */
export function monthRange(month: string): { start: Date; end: Date } {
  const match = MONTH_RE.exec(month);
  if (!match) throw new Error(`Invalid month: ${month}`);
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return {
    start: new Date(Date.UTC(year, monthIndex, 1)),
    end: new Date(Date.UTC(year, monthIndex + 1, 1)),
  };
}

/** shiftMonth("2026-01", -1) === "2025-12" */
export function shiftMonth(month: string, delta: number): string {
  const { start } = monthRange(month);
  const shifted = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

/** "2026-10" -> "October 2026" */
export function formatMonth(month: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-IN", {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
    timeZone: "UTC",
  }).format(monthRange(month).start);
}

/** Date -> "3 Oct 2026" */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Days in the month, and how many of them have passed (for budget pacing). */
export function monthProgress(month: string, now: Date = new Date()) {
  const { start, end } = monthRange(month);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  const today = todayInIndia(now);
  if (today < toDateInput(start)) return { daysInMonth, daysElapsed: 0 };
  if (today >= toDateInput(end)) return { daysInMonth, daysElapsed: daysInMonth };
  return { daysInMonth, daysElapsed: Number(today.slice(8, 10)) };
}
