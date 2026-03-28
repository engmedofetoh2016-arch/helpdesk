import { createOpenAI } from "@ai-sdk/openai";

/**
 * OpenAI chat model for @ai-sdk/openai. Override with OPENAI_MODEL (e.g. gpt-4o-mini, gpt-4o).
 */
const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
});

export const chatModel = openaiProvider(modelId);

export function assertOpenAiConfigured(): string | null {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return "OPENAI_API_KEY is not set. Add your API key to the server environment (e.g. Coolify → Environment variables).";
  }
  return null;
}

/** Walks Error#cause so nested AI_SDK errors (e.g. quota) are detected. */
function flattenErrorText(error: unknown): string {
  const parts: string[] = [];
  let e: unknown = error;
  for (let i = 0; i < 8 && e != null; i++) {
    if (e instanceof Error) {
      parts.push(e.message);
      e = e.cause;
    } else {
      parts.push(String(e));
      break;
    }
  }
  return parts.join(" ");
}

/**
 * Safe message for API responses when generateText fails (does not echo secrets).
 */
export function userMessageForOpenAiFailure(error: unknown): string {
  const t = flattenErrorText(error);
  if (
    t.includes("insufficient_quota") ||
    /exceeded your current quota/i.test(t)
  ) {
    return (
      "OpenAI API quota exceeded. ChatGPT subscriptions do not include API usage. " +
      "Add billing at https://platform.openai.com/settings/organization/billing"
    );
  }
  return "OpenAI request failed. Check OPENAI_API_KEY and OPENAI_MODEL (e.g. gpt-4o-mini).";
}
