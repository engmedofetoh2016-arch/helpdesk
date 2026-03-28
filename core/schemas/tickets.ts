import { z } from "zod/v4";
import { ticketStatuses } from "../constants/ticket-status";
import { ticketCategories } from "../constants/ticket-category";

export const inboundEmailSchema = z.object({
  from: z.email("Invalid email address"),
  fromName: z.string().trim().min(1, "Sender name is required").max(255, "Sender name is too long"),
  subject: z.string().trim().min(1, "Subject is required").max(255, "Subject is too long"),
  body: z.string().min(1, "Body is required").max(1000, "Body is too long"),
  bodyHtml: z.string().max(2000, "HTML body is too long").optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;

export const createTicketSchema = z.object({
  senderName: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  senderEmail: z.email("Invalid email address"),
  subject: z.string().trim().min(1, "Subject is required").max(255, "Subject is too long"),
  body: z.string().min(1, "Message is required").max(20000, "Message is too long"),
  bodyHtml: z.string().max(50000).optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

const sortableColumns = [
  "subject",
  "senderName",
  "status",
  "category",
  "createdAt",
] as const;

export type TicketSortField = (typeof sortableColumns)[number];

export const updateTicketSchema = z.object({
  assignedToId: z.string().nullable().optional(),
  status: z.enum(ticketStatuses).optional(),
  category: z.enum(ticketCategories).nullable().optional(),
});

export const ticketListQuerySchema = z.object({
  sortBy: z.enum(sortableColumns).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(ticketStatuses).optional(),
  category: z.enum(ticketCategories).optional(),
  senderEmail: z.string().email().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
