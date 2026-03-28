import { generateText } from "ai";
import { chatModel } from "./openai-model";
import Sentry from "./sentry";

/**
 * Classifies a customer follow-up (after reopening a resolved ticket)
 * as positive / negative / neutral. Returns null if OpenAI is unavailable or fails.
 */
export async function classifyCustomerReplySentiment(
  body: string
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return null;
  }

  try {
    const { text } = await generateText({
      model: chatModel,
      system:
        "You classify customer satisfaction in a support follow-up message. " +
        "Reply with exactly one word: positive, negative, or neutral.\n" +
        "- positive: thanks, satisfied, works now, great, solved, happy\n" +
        "- negative: still broken, not working, unhappy, angry, refund, frustrated\n" +
        "- neutral: questions, more details, unclear, or mixed",
      prompt: body.slice(0, 8000),
    });
    const t = text.trim().toLowerCase();
    if (t.includes("positive")) return "positive";
    if (t.includes("negative")) return "negative";
    return "neutral";
  } catch (e) {
    Sentry.captureException(e);
    return null;
  }
}
