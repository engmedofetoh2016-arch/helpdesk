export const senderTypes = ["agent", "customer"] as const;

export type SenderType = (typeof senderTypes)[number];

export const senderTypeLabel: Record<SenderType, string> = {
  agent: "Agent",
  customer: "Customer",
};
