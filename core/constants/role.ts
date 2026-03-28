export const Role = {
  admin: "admin",
  agent: "agent",
  customer: "customer",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
