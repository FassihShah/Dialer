import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345!";
  const userPassword = process.env.SEED_USER_PASSWORD || "User12345!";

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      role: "ADMIN",
      passwordHash: await hashPassword(adminPassword),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "agent@example.com" },
    update: {},
    create: {
      email: "agent@example.com",
      name: "Agent User",
      role: "USER",
      passwordHash: await hashPassword(userPassword),
    },
  });

  console.log("Seed complete");
  console.log(`Admin: ${admin.email} / ${adminPassword}`);
  console.log(`User: ${user.email} / ${userPassword}`);
}

main().finally(() => prisma.$disconnect());
