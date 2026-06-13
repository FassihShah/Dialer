/**
 * One-off: create (or update) the platform super-admin.
 *
 * Safe for production — it ONLY touches the super-admin account. It does not
 * create workspaces or other admins (the 0002 migration already backfilled the
 * Default Workspace and attached your existing users to it).
 *
 * Usage (point at the production DB):
 *   DATABASE_URL="<neon prod url>" \
 *   SUPER_EMAIL="you@company.com" SUPER_PASSWORD="a-strong-password" SUPER_NAME="Platform Owner" \
 *   pnpm exec tsx prisma/create-super-admin.ts
 *
 * Defaults to super@example.com / Super@1234 if the env vars are omitted.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_EMAIL || 'super@example.com';
  const name = process.env.SUPER_NAME || 'Super Admin';
  const password = process.env.SUPER_PASSWORD || 'Super@1234';

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'super_admin', status: 'active', workspaceId: null },
    create: { email, name, password: hashed, role: 'super_admin', status: 'active', workspaceId: null },
  });

  console.log(`✔ Super-admin ready: ${user.email} (role=${user.role}, status=${user.status})`);
  if (!process.env.SUPER_PASSWORD) {
    console.log('  ⚠ Using default password Super@1234 — change it after first login.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
