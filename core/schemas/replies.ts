import { z } from "zod/v4";

export const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply body is required"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;

export const polishReplySchema = z.object({
  body: z.string().min(1, "Body is required").max(1000),
});

export type PolishReplyInput = z.infer<typeof polishReplySchema>;
