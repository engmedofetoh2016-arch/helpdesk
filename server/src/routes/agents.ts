import { Router } from "express";
import { requireAuth } from "../middleware/require-auth";
import prisma from "../db";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null, id: { not: AI_AGENT_ID } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  res.json({ agents });
});

export default router;
