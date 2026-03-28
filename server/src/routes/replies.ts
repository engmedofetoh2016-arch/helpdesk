import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { parseId } from "../lib/parse-id";
import { generateText } from "ai";
import { createReplySchema, polishReplySchema } from "core/schemas/replies.ts";
import prisma from "../db";
import { sendEmailJob } from "../lib/send-email";
import {
  assertOpenAiConfigured,
  chatModel,
} from "../lib/openai-model";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true } } },
  });

  res.json({ replies });
});

router.post("/", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(createReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const reply = await prisma.reply.create({
    data: {
      body: data.body,
      senderType: "agent",
      ticketId,
      userId: req.user.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  await sendEmailJob({
    to: ticket.senderEmail,
    subject: `Re: ${ticket.subject}`,
    body: data.body,
  });

  res.status(201).json(reply);
});

router.post("/summarize", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const replies = await prisma.reply.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true } } },
  });

  const conversation = replies
    .map((r) => {
      const sender =
        r.senderType === "agent" ? (r.user?.name ?? "Agent") : ticket.senderName;
      return `${sender}: ${r.body}`;
    })
    .join("\n\n");

  const configError = assertOpenAiConfigured();
  if (configError) {
    res.status(503).json({ error: configError });
    return;
  }

  let text: string;
  try {
    const result = await generateText({
      model: chatModel,
      system:
        "You are a helpful assistant that summarizes support ticket conversations. " +
        "Provide a clear, concise summary that captures the customer's issue, any actions taken, and the current status. " +
        "Keep the summary to 2-4 sentences. Return only the summary with no preamble.",
      prompt:
        `Subject: ${ticket.subject}\n\n` +
        `Customer message:\n${ticket.body}\n\n` +
        (conversation ? `Conversation:\n${conversation}` : "No replies yet."),
    });
    text = result.text;
  } catch (e) {
    console.error("summarize error:", e);
    res.status(502).json({
      error:
        "OpenAI request failed. Check OPENAI_API_KEY and OPENAI_MODEL (e.g. gpt-4o-mini).",
    });
    return;
  }

  res.json({ summary: text });
});

router.post("/polish", requireAuth, async (req, res) => {
  const ticketId = parseId(req.params.ticketId);
  if (!ticketId) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(polishReplySchema, req.body, res);
  if (!data) return;

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const agentName = req.user.name;
  const customerName = ticket.senderName.split(" ")[0];

  const configError = assertOpenAiConfigured();
  if (configError) {
    res.status(503).json({ error: configError });
    return;
  }

  let text: string;
  try {
    const result = await generateText({
      model: chatModel,
      system:
        "You are a helpful writing assistant for a customer support team. " +
        "Improve the given reply for clarity, professional tone, and grammar. " +
        "Preserve the original meaning and keep the response concise. " +
        "Return only the improved text with no preamble or explanation. " +
        `Address the customer by their first name when natural: ${customerName}. ` +
        `End with a brief professional sign-off using the agent name: ${agentName}.`,
      prompt: data.body,
    });
    text = result.text;
  } catch (e) {
    console.error("polish error:", e);
    res.status(502).json({
      error:
        "OpenAI request failed. Check OPENAI_API_KEY and OPENAI_MODEL (e.g. gpt-4o-mini).",
    });
    return;
  }

  res.json({ body: text });
});

export default router;
