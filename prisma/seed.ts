import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic id — must match the backfill in migration 0002_workspaces.
const DEFAULT_WORKSPACE_ID = 'ws_default0000000000000000';

async function main() {
  // 1. Ensure the Default Workspace exists (the home of the original tenant).
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'default' },
    update: {},
    create: { id: DEFAULT_WORKSPACE_ID, name: 'Default Workspace', slug: 'default', status: 'active' },
  });
  console.log('Seeded workspace:', workspace.slug);

  // 2. Original admin — now a *workspace* admin attached to the default workspace.
  const password = await bcrypt.hash('Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { workspaceId: workspace.id },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password,
      role: 'admin',
      status: 'active',
      workspaceId: workspace.id,
    },
  });
  console.log('Seeded admin:', admin.email);

  // 3. Platform super-admin — provisions workspaces. No workspace of its own.
  const superPassword = await bcrypt.hash('Super@1234', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@example.com' },
    update: {},
    create: {
      email: 'super@example.com',
      name: 'Super Admin',
      password: superPassword,
      role: 'super_admin',
      status: 'active',
      workspaceId: null,
    },
  });
  console.log('Seeded super-admin:', superAdmin.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
