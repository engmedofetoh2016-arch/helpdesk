import { Router } from "express";
import multer from "multer";
import Parse from "@sendgrid/inbound-mail-parser";
import { inboundEmailSchema } from "core/schemas/tickets.ts";
import { requireWebhookSecret } from "../middleware/require-webhook-secret";
import { validate } from "../lib/validate";
import prisma from "../db";
import { sendClassifyJob } from "../lib/classify-ticket";
import { sendAutoResolveJob } from "../lib/auto-resolve-ticket";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const upload = multer();

function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

function parseFromField(from: string): { email: string; name: string } {
  const match = from.match(/^(.*?)\s*<(.+)>$/);
  if (match) {
    return { name: match[1]!.trim() || match[2]!, email: match[2]! };
  }
  return { name: from, email: from };
}

const router = Router();

router.post("/inbound-email", requireWebhookSecret, upload.any(), async (req, res) => {
  const parser = new Parse(
    { keys: ["to", "from", "subject", "text", "html"] },
    { body: req.body, files: (req.files as Express.Multer.File[]) || [] }
  );
  const parsed = parser.keyValues();
  const { email, name } = parseFromField(parsed.from || "");

  const data = validate(inboundEmailSchema, {
    from: email,
    fromName: name,
    subject: parsed.subject || "",
    body: parsed.text || "",
    bodyHtml: parsed.html || undefined,
  }, res);
  if (!data) return;

  const normalizedSubject = stripSubjectPrefixes(data.subject);

  // Check for existing open ticket from same sender with matching subject
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      senderEmail: data.from,
      status: { notIn: ["resolved", "closed"] },
      subject: { equals: normalizedSubject, mode: "insensitive" },
    },
  });

  if (existingTicket) {
    await prisma.reply.create({
      data: {
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderType: "customer",
        ticketId: existingTicket.id,
        userId: null,
      },
    });
    res.status(200).json({ ticket: existingTicket });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: normalizedSubject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.fromName,
      senderEmail: data.from,
      assignedToId: AI_AGENT_ID,
    },
  });

  res.status(201).json({ ticket });

  sendClassifyJob(ticket).catch((error) =>
    console.error(`Failed to enqueue classify job for ticket ${ticket.id}:`, error)
  );

  sendAutoResolveJob(ticket).catch((error) =>
    console.error(`Failed to enqueue auto-resolve job for ticket ${ticket.id}:`, error)
  );
});

export default router;
