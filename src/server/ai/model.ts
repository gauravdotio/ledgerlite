import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";

// One place to choose the AI models. To switch provider, swap this file for
// e.g. @ai-sdk/anthropic or @ai-sdk/openai; the rest of the app only sees
// the AI SDK's provider-neutral interface.

function google() {
  return env.GOOGLE_GENERATIVE_AI_API_KEY
    ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })
    : null;
}

export function getModel() {
  return google()?.(env.AI_MODEL) ?? null;
}

/** A lighter model to try when the main one is busy. Null if disabled. */
export function getFallbackModel() {
  if (env.AI_FALLBACK_MODEL === "none" || env.AI_FALLBACK_MODEL === env.AI_MODEL) return null;
  return google()?.(env.AI_FALLBACK_MODEL) ?? null;
}
