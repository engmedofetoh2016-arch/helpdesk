import type { Response } from "express";
import type { ZodType } from "zod/v4";

export function validate<T>(
  schema: ZodType<T>,
  body: unknown,
  res: Response
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    res
      .status(400)
      .json({ error: result.error.issues[0]?.message ?? "Validation failed" });
    return null;
  }
  return result.data;
}
