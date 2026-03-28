import fs from "fs";
import path from "path";
import type { PgBoss } from "pg-boss";
import { generateText } from "ai";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";
import {
  assertOpenAiConfigured,
  chatModel,
} from "./openai-model";
import Sentry from "./sentry";
import prisma from "../db";
import { sendEmailJob } from "./send-email";

const QUEUE_NAME = "auto-resolve-ticket";

const knowledgeBase = fs.readFileSync(
  path.join(import.meta.dirname, "../../knowledge-base.md"),
  "utf-8"
);

function supportBrandName(): string {
  return process.env.SUPPORT_BRAND_NAME?.trim() || "Mohamed Fetoh";
}

/** Closing line for acknowledgements and AI sign-off (e.g. "Support Team"). Override with SUPPORT_SIGN_OFF_LINE. */
function supportSignOffLine(): string {
  return process.env.SUPPORT_SIGN_OFF_LINE?.trim() || "Support Team";
}

/** Model sometimes adds punctuation or whitespace; treat as escalation. */
function isEscalateResponse(text: string): boolean {
  const first = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return /^ESCALATE[.!]?$/i.test(first) || first.toUpperCase() === "ESCALATE";
}

function buildConversationBody(ticket: {
  body: string;
  replies: { body: string; senderType: string }[];
}): string {
  const parts: string[] = [`Initial message from customer:\n${ticket.body}`];
  for (const r of ticket.replies) {
    const label = r.senderType === "customer" ? "Customer" : "Support";
    parts.push(`${label}:\n${r.body}`);
  }
  return parts.join("\n\n");
}

/** Shown when the AI cannot answer from the KB (ESCALATE). Override with ESCALATION_ACK_MESSAGE. */
function ackEscalateFromKb(firstName: string): string {
  const custom = process.env.ESCALATION_ACK_MESSAGE?.trim();
  if (custom) return custom;
  const signOff = supportSignOffLine();
  return (
    `Thank you for contacting us, ${firstName}.\n\n` +
    `We were unable to find a complete answer in our help articles for your request. ` +
    `Our support team will review your case and respond to you directly.\n\n` +
    `Best regards,\n${signOff}`
  );
}

/** Shown when OpenAI is missing, errors, or quota issues. Override with AUTO_RESOLVE_FAILURE_ACK_MESSAGE. */
function ackAutoResolveFailed(firstName: string): string {
  const custom = process.env.AUTO_RESOLVE_FAILURE_ACK_MESSAGE?.trim();
  if (custom) return custom;
  const signOff = supportSignOffLine();
  return (
    `Thank you for contacting us, ${firstName}.\n\n` +
    `We were unable to generate an automated reply at this time. ` +
    `Your request has been received, and a member of our support team will follow up with you shortly.\n\n` +
    `Best regards,\n${signOff}`
  );
}

async function postAgentAckReply(params: {
  ticketId: number;
  subject: string;
  senderEmail: string;
  body: string;
}): Promise<void> {
  const { ticketId, subject, senderEmail, body } = params;
  await prisma.$transaction([
    prisma.reply.create({
      data: {
        body,
        senderType: "agent",
        ticketId,
        userId: null,
      },
    }),
    prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "open", assignedToId: null },
    }),
  ]);
  try {
    await sendEmailJob({
      to: senderEmail,
      subject: `Re: ${subject}`,
      body,
    });
  } catch (e) {
    console.error(`Escalation ack email enqueue failed for ticket ${ticketId}:`, e);
  }
}

interface AutoResolveJobData {
  ticketId: number;
}

export async function registerAutoResolveWorker(boss: PgBoss): Promise<void> {
  await boss.createQueue(QUEUE_NAME, {
    retryLimit: 3,
    retryDelay: 30,
    retryBackoff: true,
  });

  await boss.work<AutoResolveJobData>(QUEUE_NAME, async (jobs) => {
    const { ticketId } = jobs[0]!.data;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { replies: { orderBy: { createdAt: "asc" } } },
    });

    if (!ticket) {
      console.warn(`Auto-resolve: ticket ${ticketId} not found, skipping`);
      return;
    }

    if (ticket.assignedToId !== AI_AGENT_ID) {
      console.log(
        `Auto-resolve skipped for ticket ${ticketId}: not assigned to AI agent`
      );
      return;
    }

    if (ticket.status === "resolved" || ticket.status === "closed") {
      return;
    }

    const { subject, senderName, senderEmail } = ticket;
    const firstName = senderName.split(" ")[0];
    const brand = supportBrandName();

    const configError = assertOpenAiConfigured();
    if (configError) {
      console.error(`Auto-resolve: ${configError} (ticket ${ticketId})`);
      await postAgentAckReply({
        ticketId,
        subject,
        senderEmail,
        body: ackAutoResolveFailed(firstName),
      });
      return;
    }

    const body = buildConversationBody(ticket);

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: "processing" },
    });

    const signOff = supportSignOffLine();
    let response: string;
    try {
      const { text } = await generateText({
        model: chatModel,
        system:
          `You are a friendly and professional support agent for ${brand}. ` +
          "Use ONLY the following knowledge base to answer the customer's question.\n\n" +
          knowledgeBase +
          "\n\n" +
          "Guidelines for your response:\n" +
          `- Address the customer by their first name: ${firstName}\n` +
          "- Use a warm, professional, and customer-friendly tone\n" +
          "- Format the response clearly with line breaks between paragraphs\n" +
          "- Use bullet points or numbered lists when listing steps or multiple items\n" +
          "- End with an offer to help further, e.g. 'If you have any other questions, feel free to reach out.'\n" +
          `- Sign off with exactly this closing (two lines):\n\nBest regards,\n${signOff}\n\n` +
          "If the knowledge base does NOT contain enough information to fully resolve the question, " +
          'respond with exactly "ESCALATE" and nothing else.',
        prompt: `Subject: ${subject}\n\nConversation:\n${body}`,
      });
      response = text.trim();
    } catch (error) {
      Sentry.captureException(error, {
        tags: { queue: QUEUE_NAME, ticketId },
      });
      console.error(`Auto-resolve AI call failed for ticket ${ticketId}:`, error);
      await postAgentAckReply({
        ticketId,
        subject,
        senderEmail,
        body: ackAutoResolveFailed(firstName),
      });
      return;
    }

    if (isEscalateResponse(response)) {
      await postAgentAckReply({
        ticketId,
        subject,
        senderEmail,
        body: ackEscalateFromKb(firstName),
      });
    } else {
      try {
        await prisma.$transaction([
          prisma.reply.create({
            data: {
              body: response,
              senderType: "agent",
              ticketId,
              userId: null,
            },
          }),
          prisma.ticket.update({
            where: { id: ticketId },
            data: { status: "resolved" },
          }),
        ]);

        await sendEmailJob({
          to: senderEmail,
          subject: `Re: ${subject}`,
          body: response,
        });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { queue: QUEUE_NAME, ticketId },
        });
        throw error;
      }
    }
  });
}

export async function sendAutoResolveJob(ticket: { id: number }): Promise<void> {
  const { boss } = await import("./queue");
  await boss.send(QUEUE_NAME, { ticketId: ticket.id });
}
