import { describe, expect, it } from "vitest";
import { formatINR, normaliseAmount } from "@/lib/money";
import { csvCell, toCsv } from "@/lib/csv";

describe("money", () => {
  it("formats with Indian lakh/crore grouping", () => {
    expect(formatINR(123456.5)).toBe("₹1,23,456.50");
    expect(formatINR({ toString: () => "10000000" })).toBe("₹1,00,00,000.00");
  });

  it("accepts the ways people type amounts", () => {
    expect(normaliseAmount("1,180")).toBe("1180.00");
    expect(normaliseAmount("₹ 99.5")).toBe("99.50");
    expect(normaliseAmount("Rs. 250")).toBe("250.00");
  });

  it("rejects anything that isn't a plain amount", () => {
    for (const bad of ["", "abc", "-5", "1.234", "1e5", "12,34,56,78,90,123"]) {
      expect(normaliseAmount(bad), bad).toBeNull();
    }
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('Gupta "Packaging", Co.')).toBe('"Gupta ""Packaging"", Co."');
    expect(toCsv([["a", 1], [null, "b\nc"]])).toBe('a,1\r\n,"b\nc"\r\n');
  });

  it("neutralises spreadsheet formulas (CSV injection)", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+91 98765")).toBe("'+91 98765");
    expect(csvCell(-5)).toBe("-5"); // real negative numbers are left alone
  });
});
