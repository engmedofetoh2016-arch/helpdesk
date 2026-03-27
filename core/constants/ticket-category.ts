export const ticketCategories = [
  "general_question",
  "technical_question",
  "refund_request",
] as const;

export type TicketCategory = (typeof ticketCategories)[number];

export const categoryLabel: Record<TicketCategory, string> = {
  general_question: "General",
  technical_question: "Technical",
  refund_request: "Refund",
};
