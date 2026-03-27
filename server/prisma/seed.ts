import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  TicketStatus,
  TicketCategory,
} from "../src/generated/prisma/client";
import { hashPassword } from "better-auth/crypto";
import { AI_AGENT_ID } from "core/constants/ai-agent.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env"
    );
  }

  const now = new Date();

  // Seed admin user
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`Admin user ${email} already exists — skipping.`);
  } else {
    const hashedPassword = await hashPassword(password);
    const userId = crypto.randomUUID();

    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name: "Admin",
          email,
          emailVerified: false,
          role: Role.admin,
          createdAt: now,
          updatedAt: now,
        },
      }),
      prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      }),
    ]);
    console.log(`Admin user ${email} created successfully.`);
  }

  // Seed AI agent user
  const existingAI = await prisma.user.findUnique({
    where: { id: AI_AGENT_ID },
  });
  if (existingAI) {
    console.log("AI agent user already exists — skipping.");
  } else {
    await prisma.user.create({
      data: {
        id: AI_AGENT_ID,
        name: "AI",
        email: "ai@helpdesk.local",
        emailVerified: false,
        role: Role.agent,
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log("AI agent user created successfully.");
  }

  await seedDemoTickets();
}

async function seedDemoTickets() {
  const enabled =
    process.env.SEED_DEMO_TICKETS === "1" ||
    process.env.SEED_DEMO_TICKETS === "true";
  if (!enabled) return;

  const count = await prisma.ticket.count();
  if (count > 0) {
    console.log("Skipping demo tickets — database already has tickets.");
    return;
  }

  await prisma.ticket.createMany({
    data: [
      {
        subject: "Demo: Cannot log in after password reset",
        body: "I used the reset link but the new password is never accepted on the login page.",
        senderName: "Jamie Rivera",
        senderEmail: "jamie.rivera@example.com",
        status: TicketStatus.new,
        category: TicketCategory.technical_question,
        assignedToId: AI_AGENT_ID,
      },
      {
        subject: "Demo: Question about billing cycle",
        body: "When exactly does our annual plan renew? I want to align it with our fiscal year.",
        senderName: "Sam Okonkwo",
        senderEmail: "sam.okonkwo@smallbiz.test",
        status: TicketStatus.open,
        category: TicketCategory.general_question,
        assignedToId: AI_AGENT_ID,
      },
      {
        subject: "Demo: Request refund for duplicate charge",
        body: "I was charged twice for invoice #INV-2026-0142. Please refund the duplicate.",
        senderName: "Taylor Morgan",
        senderEmail: "taylor@consulting.demo",
        status: TicketStatus.processing,
        category: TicketCategory.refund_request,
        assignedToId: AI_AGENT_ID,
      },
    ],
  });

  console.log("Demo tickets (3) created — open the Tickets page to explore.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
