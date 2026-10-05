import { describe, expect, it } from "vitest";
import {
  formatMonth,
  monthProgress,
  monthRange,
  parseDateOnly,
  shiftMonth,
  todayInIndia,
} from "@/lib/dates";

describe("dates", () => {
  it("uses India time to decide what today is", () => {
    // 20:00 UTC on 31 Oct is already 1 Nov in India (UTC+5:30).
    expect(todayInIndia(new Date("2026-10-31T20:00:00Z"))).toBe("2026-11-01");
    expect(todayInIndia(new Date("2026-10-31T18:00:00Z"))).toBe("2026-10-31");
  });

  it("rejects impossible dates instead of rolling them over", () => {
    expect(parseDateOnly("2026-02-31")).toBeNull();
    expect(parseDateOnly("2026-13-01")).toBeNull();
    expect(parseDateOnly("05/10/2026")).toBeNull();
    expect(parseDateOnly("2028-02-29")?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("builds half-open month ranges and shifts across years", () => {
    const { start, end } = monthRange("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 3)).toBe("2027-02");
  });

  it("formats months for people", () => {
    expect(formatMonth("2026-10")).toBe("October 2026");
  });

  it("knows how far through a month we are", () => {
    const now = new Date("2026-10-05T06:00:00Z");
    expect(monthProgress("2026-10", now)).toEqual({ daysInMonth: 31, daysElapsed: 5 });
    expect(monthProgress("2026-09", now)).toEqual({ daysInMonth: 30, daysElapsed: 30 });
    expect(monthProgress("2026-11", now)).toEqual({ daysInMonth: 30, daysElapsed: 0 });
  });
});
