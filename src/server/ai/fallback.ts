import "server-only";
import { APICallError, RetryError, type LanguageModel } from "ai";
import { getFallbackModel, getModel } from "./model";

// Free-tier models are often briefly overloaded ("high demand", HTTP 503)
// or rate-limited (429). When that happens we try the fallback model instead
// of failing. Any other error (bad request, invalid key) fails immediately,
// because a second model wouldn't fix it.

const BUSY_STATUS = new Set([429, 500, 503, 529]);
const BUSY_TEXT = /high demand|overloaded|unavailable|rate limit|quota|resource.?exhausted/i;

function isBusy(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    return BUSY_STATUS.has(error.statusCode ?? 0) || BUSY_TEXT.test(error.message);
  }
  return error instanceof Error && BUSY_TEXT.test(error.message);
}

/** True if the model was overloaded or rate-limited (possibly after retries). */
export function isBusyError(error: unknown): boolean {
  return RetryError.isInstance(error) ? error.errors.some(isBusy) : isBusy(error);
}

/** True if the free-tier quota (not just a momentary spike) ran out. */
export function isQuotaError(error: unknown): boolean {
  const errors = RetryError.isInstance(error) ? error.errors : [error];
  return errors.some(
    (e) =>
      (APICallError.isInstance(e) && e.statusCode === 429) ||
      (e instanceof Error && /quota/i.test(e.message)),
  );
}

/**
 * Runs `task` with the main model, then with the fallback model if the main
 * one was busy. Throws the last error if every model failed.
 */
export async function withModelFallback<T>(task: (model: LanguageModel) => Promise<T>): Promise<T> {
  const models = [getModel(), getFallbackModel()].filter((m) => m !== null);
  let lastError: unknown = new Error("AI is not configured");
  for (const model of models) {
    try {
      return await task(model);
    } catch (error) {
      lastError = error;
      if (!isBusyError(error)) throw error;
      console.warn(
        `AI model busy, ${model === models.at(-1) ? "no more fallbacks" : "trying fallback model"}`,
      );
    }
  }
  throw lastError;
}

export const AI_BUSY_MESSAGE = "Google's AI is very busy right now. Try again in a minute.";
export const AI_QUOTA_MESSAGE = "The free AI quota is used up for now. Try again later.";
