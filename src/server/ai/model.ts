import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/lib/env";

// One place to choose the AI model. To switch provider, swap this file for
// e.g. @ai-sdk/anthropic or @ai-sdk/openai; the rest of the app only sees
// the AI SDK's provider-neutral interface.
export function getModel() {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) return null;
  const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
  return google(env.AI_MODEL);
}
