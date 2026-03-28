import { openai } from "@ai-sdk/openai";

/**
 * OpenAI chat model for @ai-sdk/openai. Override with OPENAI_MODEL (e.g. gpt-4o-mini, gpt-4o).
 */
const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

export const chatModel = openai(modelId);

export function assertOpenAiConfigured(): string | null {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return "OPENAI_API_KEY is not set. Add your API key to the server environment (e.g. Coolify → Environment variables).";
  }
  return null;
}
