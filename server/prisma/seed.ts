import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/client";
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
