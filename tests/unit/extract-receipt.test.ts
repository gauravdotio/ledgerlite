import { beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { scriptedModel, textResponse } from "../helpers/mock-model";

let model: MockLanguageModelV4 | null = null;
let fallback: MockLanguageModelV4 | null = null;
vi.mock("@/server/ai/model", () => ({ getModel: () => model, getFallbackModel: () => fallback }));

const { extractReceipt } = await import("@/server/ai/extract-receipt");

// What Gemini returns when the free tier is overloaded. isRetryable: false
// keeps the test fast (no SDK retry delays).
function busyError() {
  return new APICallError({
    message: "This model is currently experiencing high demand.",
    url: "https://generativelanguage.googleapis.com",
    requestBodyValues: {},
    statusCode: 503,
    isRetryable: false,
  });
}

const image = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const good = {
  isReceipt: true,
  vendor: "Shree Ganesh Stores",
  date: "2026-10-03",
  total: 1180,
  gstTotal: 180,
  gstin: null,
  paymentMode: "UPI",
  category: "Packaging",
  lineItems: [{ description: "Carry bags x200", amount: 800 }],
  confidence: "high",
};

describe("extractReceipt", () => {
  beforeEach(() => {
    model = null;
    fallback = null;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns structured data when the model answers in the schema", async () => {
    model = scriptedModel(textResponse(JSON.stringify(good)));
    const result = await extractReceipt(image, "image/jpeg", ["Packaging", "Rent"]);
    expect(result).toEqual({ ok: true, data: good });

    // The image and the category list were actually sent to the model.
    const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(prompt).toContain("Packaging | Rent");
    expect(model.doGenerateCalls[0]?.prompt.at(-1)?.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "file", mediaType: "image/jpeg" })]),
    );
  });

  it("fails cleanly when the photo isn't a receipt", async () => {
    model = scriptedModel(textResponse(JSON.stringify({ ...good, isReceipt: false })));
    expect(await extractReceipt(image, "image/jpeg", [])).toEqual({
      ok: false,
      error: "This doesn't look like a bill or receipt.",
    });
  });

  it("fails cleanly when the model returns something off-schema", async () => {
    model = scriptedModel(textResponse('{"vendor": 42}'));
    const result = await extractReceipt(image, "image/jpeg", []);
    expect(result.ok).toBe(false);
  });

  it("falls back to the second model when the first is overloaded", async () => {
    model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw busyError();
      },
    });
    fallback = scriptedModel(textResponse(JSON.stringify(good)));
    expect(await extractReceipt(image, "image/jpeg", [])).toEqual({ ok: true, data: good });
    expect(fallback.doGenerateCalls).toHaveLength(1);
  });

  it("says the AI is busy when every model is overloaded", async () => {
    const alwaysBusy = () =>
      new MockLanguageModelV4({
        doGenerate: async () => {
          throw busyError();
        },
      });
    model = alwaysBusy();
    fallback = alwaysBusy();
    const result = await extractReceipt(image, "image/jpeg", []);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("busy") });
  });

  it("does not try the fallback for errors a second model can't fix", async () => {
    model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new APICallError({
          message: "API key not valid",
          url: "x",
          requestBodyValues: {},
          statusCode: 400,
          isRetryable: false,
        });
      },
    });
    fallback = scriptedModel(textResponse(JSON.stringify(good)));
    expect((await extractReceipt(image, "image/jpeg", [])).ok).toBe(false);
    expect(fallback.doGenerateCalls).toHaveLength(0);
  });

  it("explains when AI isn't configured", async () => {
    expect(await extractReceipt(image, "image/jpeg", [])).toMatchObject({
      ok: false,
      error: expect.stringContaining("not configured"),
    });
  });
});
