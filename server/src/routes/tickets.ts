import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import { validate } from "../lib/validate";
import { parseId } from "../lib/parse-id";
import {
  createTicketSchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from "core/schemas/tickets.ts";
import prisma from "../db";
import type { Prisma } from "../generated/prisma/client";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";
import { sendClassifyJob } from "../lib/classify-ticket";
import { sendAutoResolveJob } from "../lib/auto-resolve-ticket";

interface TicketStatsRow {
  totalTickets: bigint;
  openTickets: bigint;
  resolvedByAI: bigint;
  aiResolutionRate: number;
  avgResolutionTime: number;
}

const router = Router();

router.get("/stats", requireAuth, async (_req, res) => {
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

router.get("/stats/daily-volume", requireAuth, async (_req, res) => {
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

router.get("/customers", requireAuth, async (_req, res) => {
  const rows = await prisma.ticket.findMany({
    distinct: ["senderEmail"],
    select: { senderEmail: true, senderName: true },
    orderBy: { senderEmail: "asc" },
  });

  res.json({ customers: rows });
});

router.post("/", requireAuth, async (req, res) => {
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

  sendAutoResolveJob(ticket).catch((error) =>
    console.error(`Failed to enqueue auto-resolve job for ticket ${ticket.id}:`, error)
  );
});

router.get("/", requireAuth, async (req, res) => {
  const query = validate(ticketListQuerySchema, req.query, res);
  if (!query) return;

  const where: Prisma.TicketWhereInput = {};

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

  res.json(ticket);
});

router.patch("/:id", requireAuth, async (req, res) => {
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
