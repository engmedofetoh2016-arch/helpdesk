import { Router } from "express";
import { generateText } from "ai";
import { requireAuth } from "../middleware/require-auth";
import { requireAgent } from "../middleware/require-agent";
import { validate } from "../lib/validate";
import { parseId } from "../lib/parse-id";
import {
  createTicketSchema,
  customerCreateTicketSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from "core/schemas/tickets.ts";
import { polishReplySchema } from "core/schemas/replies.ts";
import prisma from "../db";
import type { Prisma } from "../generated/prisma/client";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";
import { sendClassifyJob } from "../lib/classify-ticket";
import { Role } from "core/constants/role.ts";
import {
  assertOpenAiConfigured,
  chatModel,
  userMessageForOpenAiFailure,
} from "../lib/openai-model";

interface TicketStatsRow {
  totalTickets: bigint;
  openTickets: bigint;
  resolvedByAI: bigint;
  aiResolutionRate: number;
  avgResolutionTime: number;
}

const router = Router();

router.get("/stats", requireAuth, requireAgent, async (_req, res) => {
  const [row] = await prisma.$queryRaw<
    [TicketStatsRow]
  >`SELECT * FROM get_ticket_stats(${AI_AGENT_ID})`;

  res.json({
    totalTickets: Number(row.totalTickets),
    openTickets: Number(row.openTickets),
    resolvedByAI: Number(row.resolvedByAI),
    aiResolutionRate: row.aiResolutionRate,
    avgResolutionTime: row.avgResolutionTime,
  });
});

router.get("/stats/daily-volume", requireAuth, requireAgent, async (_req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true },
  });

  // Build a map of date -> count
  const countsByDate = new Map<string, number>();
  for (const t of tickets) {
    const dateKey = t.createdAt.toISOString().slice(0, 10);
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  // Fill in all 30 days (including zeros)
  const data: { date: string; tickets: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateKey = d.toISOString().slice(0, 10);
    data.push({ date: dateKey, tickets: countsByDate.get(dateKey) ?? 0 });
  }

  res.json({ data });
});

function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(Re:\s*|Fwd:\s*)+/i, "").trim();
}

router.get("/customers", requireAuth, requireAgent, async (_req, res) => {
  const rows = await prisma.ticket.findMany({
    distinct: ["senderEmail"],
    select: { senderEmail: true, senderName: true },
    orderBy: { senderEmail: "asc" },
  });

  res.json({ customers: rows });
});

router.post("/polish-draft", requireAuth, async (req, res) => {
  const data = validate(polishReplySchema, req.body, res);
  if (!data) return;

  const configError = assertOpenAiConfigured();
  if (configError) {
    res.status(503).json({ error: configError });
    return;
  }

  const system =
    req.user.role === Role.customer
      ? "You help customers write clear, polite support requests. Improve clarity, grammar, and tone. " +
        "Keep the same meaning and facts. Return only the improved text with no preamble."
      : "You help support staff draft clear customer-facing messages. Improve clarity and tone. " +
        "Return only the improved text with no preamble.";

  try {
    const result = await generateText({
      model: chatModel,
      system,
      prompt: data.body,
    });
    res.json({ body: result.text });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("polish-draft error:", detail, e);
    res.status(502).json({
      error: userMessageForOpenAiFailure(e),
      ...(process.env.NODE_ENV !== "production" && { details: detail }),
    });
  }
});

router.post("/", requireAuth, async (req, res) => {
  if (req.user.role === Role.customer) {
    const data = validate(customerCreateTicketSchema, req.body, res);
    if (!data) return;

    const subject = stripSubjectPrefixes(data.subject);

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body: data.body,
        bodyHtml: data.bodyHtml ?? null,
        senderName: req.user.name,
        senderEmail: req.user.email,
        assignedToId: AI_AGENT_ID,
        ...(data.category != null && { category: data.category }),
      },
    });

    res.status(201).json(ticket);

    if (data.category == null) {
      sendClassifyJob(ticket).catch((error) =>
        console.error(
          `Failed to enqueue classify job for ticket ${ticket.id}:`,
          error
        )
      );
    }

    // Portal requests should stay open for staff; auto-resolve would mark many as resolved from the KB.
    return;
  }

  const data = validate(createTicketSchema, req.body, res);
  if (!data) return;

  const subject = stripSubjectPrefixes(data.subject);

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body: data.body,
      bodyHtml: data.bodyHtml ?? null,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      assignedToId: AI_AGENT_ID,
    },
  });

  res.status(201).json(ticket);

  sendClassifyJob(ticket).catch((error) =>
    console.error(`Failed to enqueue classify job for ticket ${ticket.id}:`, error)
  );
});

router.get("/", requireAuth, async (req, res) => {
  const query = validate(ticketListQuerySchema, req.query, res);
  if (!query) return;

  const where: Prisma.TicketWhereInput = {};

  if (req.user.role === Role.customer) {
    where.senderEmail = req.user.email;
    if (query.status) {
      where.status = query.status;
    }
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: "insensitive" } },
        { body: { contains: query.search, mode: "insensitive" } },
      ];
    }
  } else {
    if (query.status) {
      where.status = query.status;
    }

    if (query.senderEmail) {
      where.senderEmail = query.senderEmail;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, mode: "insensitive" } },
        { senderName: { contains: query.search, mode: "insensitive" } },
        { senderEmail: { contains: query.search, mode: "insensitive" } },
      ];
    }
  }

  const [tickets, total] = await Promise.all([
    prisma.ticket.findMany({
      select: {
        id: true,
        subject: true,
        status: true,
        category: true,
        senderName: true,
        senderEmail: true,
        createdAt: true,
      },
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({ tickets, total, page: query.page, pageSize: query.pageSize });
});

router.get("/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (req.user.role === Role.customer && ticket.senderEmail !== req.user.email) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  res.json(ticket);
});

router.patch("/:id", requireAuth, requireAgent, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid ticket ID" });
    return;
  }

  const data = validate(updateTicketSchema, req.body, res);
  if (!data) return;

  if (data.assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: data.assignedToId, deletedAt: null },
    });
    if (!user) {
      res.status(400).json({ error: "Invalid agent" });
      return;
    }
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      ...("assignedToId" in data && { assignedToId: data.assignedToId }),
      ...("status" in data && { status: data.status }),
      ...("category" in data && { category: data.category }),
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(updated);
});

export default router;
