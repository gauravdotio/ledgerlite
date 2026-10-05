import { MockLanguageModelV4 } from "ai/test";

// Builds fake model responses, so AI code paths can be tested without a
// network call, an API key, or any cost.

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
};

export function textResponse(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: { unified: "stop" as const, raw: "stop" },
    usage,
    warnings: [],
  };
}

export function toolCallResponse(toolName: string, input: unknown) {
  return {
    content: [{ type: "tool-call" as const, toolCallId: `call-${toolName}`, toolName, input: JSON.stringify(input) }],
    finishReason: { unified: "tool-calls" as const, raw: "tool_calls" },
    usage,
    warnings: [],
  };
}

/** A model that returns the given responses in order, one per call. */
export function scriptedModel(...responses: ReturnType<typeof textResponse | typeof toolCallResponse>[]) {
  return new MockLanguageModelV4({ doGenerate: responses });
}
