import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { MockLanguageModelV4 } from "ai/test";
import { scriptedModel, textResponse, toolCallResponse } from "../helpers/mock-model";

// Runs against a real Postgres (DATABASE_URL). Skipped when none is configured.
const hasDb = Boolean(process.env["DATABASE_URL"]) && !process.env["DATABASE_URL"]!.includes("test:test@");

let model: MockLanguageModelV4 | null = null;
vi.mock("@/server/ai/model", () => ({ getModel: () => model }));

describe.skipIf(!hasDb)("AI spending tools (database)", async () => {
  const { db } = await import("@/lib/db");
  const { createSpendingTools } = await import("@/server/ai/spending-tools");
  const { askAboutSpending } = await import("@/server/ai/ask");

  const tag = `itest-${Date.now()}`;
  let alice = "";
  let bob = "";

  // Minimal options object the AI SDK passes to tool.execute().
  const opts = { toolCallId: "t", messages: [] } as never;

  beforeAll(async () => {
    for (const [name, amount, vendor] of [
      ["alice", "1000.00", "Alice Supplier"],
      ["bob", "99999.00", "Bob Secret Vendor"],
    ] as const) {
      const user = await db.user.create({
        data: {
          email: `${name}-${tag}@example.test`,
          categories: { create: [{ name: "Stock / Inventory" }] },
        },
        include: { categories: true },
      });
      await db.expense.create({
        data: {
          userId: user.id,
          categoryId: user.categories[0]!.id,
          amount,
          gstAmount: "0",
          vendor,
          date: new Date("2026-09-15"),
          paymentMode: "UPI",
        },
      });
      if (name === "alice") alice = user.id;
      else bob = user.id;
    }
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: `${tag}@example.test` } } });
    await db.$disconnect();
  });

  it("only ever sees the signed-in user's expenses", async () => {
    const tools = createSpendingTools(alice);
    const summary = await tools.spendingSummary.execute!(
      { from: "2026-01-01", to: "2026-12-31", groupBy: "vendor" },
      opts,
    );
    expect(summary).toEqual([{ vendor: "Alice Supplier", total: 1000, gst: 0, count: 1 }]);

    // Even asking for Bob's vendor by name finds nothing.
    const list = await tools.findExpenses.execute!(
      { from: "2026-01-01", to: "2026-12-31", vendorContains: "Bob Secret", limit: 10 },
      opts,
    );
    expect(list).toEqual([]);
  });

  it("groups by month with SQL filters bound as parameters", async () => {
    const tools = createSpendingTools(bob);
    const rows = await tools.spendingSummary.execute!(
      // A classic injection string is treated as plain text.
      { from: "2026-09-01", to: "2026-09-30", groupBy: "month", vendorContains: "'; DROP TABLE expenses; --" },
      opts,
    );
    expect(rows).toEqual([]);
    expect(await db.expense.count({ where: { userId: bob } })).toBe(1);
  });

  it("rejects bad or huge date ranges", async () => {
    const tools = createSpendingTools(alice);
    expect(await tools.spendingSummary.execute!({ from: "2026-09-30", to: "2026-09-01", groupBy: "none" }, opts)).toHaveProperty("error");
    expect(await tools.spendingSummary.execute!({ from: "1990-01-01", to: "2026-01-01", groupBy: "none" }, opts)).toHaveProperty("error");
  });

  it("runs the full ask loop: model calls a tool, then answers", async () => {
    model = scriptedModel(
      toolCallResponse("spendingSummary", { from: "2026-09-01", to: "2026-09-30", groupBy: "none" }),
      textResponse("You spent ₹1,000 in September."),
    );
    const result = await askAboutSpending(alice, "How much did I spend in September?");
    expect(result).toEqual({ ok: true, answer: "You spent ₹1,000 in September.", lookups: ["Totals"] });

    // The tool result fed back to the model is Alice's total, not Bob's.
    const secondPrompt = JSON.stringify(model.doGenerateCalls[1]?.prompt);
    expect(secondPrompt).toContain('"total":1000');
    expect(secondPrompt).not.toContain("99999");
  });
});
