import type { RequestHandler } from "express";

export const requireWebhookSecret: RequestHandler = (req, res, next) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Webhook secret is not configured" });
    return;
  }

  const provided =
    req.headers["x-webhook-secret"] || req.query.secret;

  if (provided !== secret) {
    res.status(401).json({ error: "Invalid webhook secret" });
    return;
  }

  next();
};
