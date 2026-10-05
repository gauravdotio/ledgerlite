import { describe, expect, it } from "vitest";
import { expenseFiltersSchema, expenseSchema } from "@/lib/validation/expense";
import { extractionToFormDefaults, type ReceiptExtraction } from "@/lib/validation/receipt";

const valid = {
  amount: "1,180",
  gstAmount: "180",
  date: "2026-10-03",
  vendor: "  Shree Ganesh Stores ",
  categoryId: "cat_1",
  paymentMode: "UPI",
  notes: "",
};

describe("expenseSchema", () => {
  it("normalises a valid expense", () => {
    const result = expenseSchema.parse(valid);
    expect(result).toMatchObject({ amount: "1180.00", gstAmount: "180.00", vendor: "Shree Ganesh Stores", notes: null });
  });

  it("defaults GST to 0 when left empty", () => {
    expect(expenseSchema.parse({ ...valid, gstAmount: "" }).gstAmount).toBe("0.00");
  });

  it("rejects GST larger than the total", () => {
    const result = expenseSchema.safeParse({ ...valid, gstAmount: "2000" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["gstAmount"]);
  });

  it("rejects zero amounts, future dates and unknown payment modes", () => {
    expect(expenseSchema.safeParse({ ...valid, amount: "0" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...valid, date: "2099-01-01" }).success).toBe(false);
    expect(expenseSchema.safeParse({ ...valid, paymentMode: "CHEQUE" }).success).toBe(false);
  });
});

describe("expenseFiltersSchema", () => {
  it("drops junk from the URL instead of erroring", () => {
    expect(expenseFiltersSchema.parse({ month: "2026-13", mode: "BITCOIN", page: "-4" })).toEqual({
      month: undefined,
      category: undefined,
      mode: undefined,
      q: undefined,
      page: 1,
    });
    expect(expenseFiltersSchema.parse({ month: "all", page: "3" })).toMatchObject({ month: "all", page: 3 });
  });
});

describe("extractionToFormDefaults", () => {
  const categories = [
    { id: "c1", name: "Packaging" },
    { id: "c2", name: "Stock / Inventory" },
  ];
  const base: ReceiptExtraction = {
    isReceipt: true,
    vendor: " Shree Ganesh Stores ",
    date: "2026-10-03",
    total: 1180,
    gstTotal: 180,
    gstin: "07AABCS1429B1Z5",
    paymentMode: "UPI",
    category: "packaging",
    lineItems: [],
    confidence: "high",
  };

  it("maps a good extraction onto the form", () => {
    expect(extractionToFormDefaults(base, categories, "2026-10-05")).toEqual({
      amount: "1180.00",
      gstAmount: "180.00",
      date: "2026-10-03",
      vendor: "Shree Ganesh Stores",
      categoryId: "c1",
      paymentMode: "UPI",
      notes: "GSTIN 07AABCS1429B1Z5",
    });
  });

  it("drops implausible values rather than trusting the model", () => {
    const out = extractionToFormDefaults(
      { ...base, date: "2031-01-01", gstTotal: 5000, category: "Something invented" },
      categories,
      "2026-10-05",
    );
    // Future date -> today; GST above the total -> dropped; unknown category -> unset.
    expect(out).toMatchObject({ date: "2026-10-05", gstAmount: "0.00", categoryId: "", amount: "1180.00" });
  });

  it("leaves the total empty when the model couldn't read it", () => {
    expect(extractionToFormDefaults({ ...base, total: null }, categories, "2026-10-05").amount).toBe("");
  });
});
