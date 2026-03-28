export const senderTypes = ["agent", "customer"] as const;

export type SenderType = (typeof senderTypes)[number];

/** Shown for automated / unnamed agent replies. Override in UI via VITE_SUPPORT_AGENT_LABEL. */
export const senderTypeLabel: Record<SenderType, string> = {
  agent: "Support Team",
  customer: "Customer",
};
