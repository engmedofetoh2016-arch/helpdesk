import type { RequestHandler } from "express";
import { Role } from "core/constants/role.ts";

/** Blocks customers; use after requireAuth on agent/admin-only routes. */
export const requireAgent: RequestHandler = (req, res, next) => {
  if (req.user.role === Role.customer) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
};
