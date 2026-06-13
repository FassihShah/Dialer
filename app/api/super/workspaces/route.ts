import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid admin email'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workspace';
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const workspaces = await db.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, leads: true, phoneNumbers: true } },
      users: { where: { role: 'admin' }, select: { id: true, name: true, email: true, status: true }, orderBy: { createdAt: 'asc' } },
      voipConfigs: { where: { active: true }, select: { id: true }, take: 1 },
    },
  });

  return NextResponse.json(workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    status: w.status,
    createdAt: w.createdAt,
    counts: { users: w._count.users, leads: w._count.leads, numbers: w._count.phoneNumbers },
    admins: w.users,
    voipConfigured: w.voipConfigs.length > 0,
  })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });

  const { name, adminName, adminEmail, adminPassword } = parsed.data;

  // Email is globally unique (one login = one account).
  const emailTaken = await db.user.findUnique({ where: { email: adminEmail } });
  if (emailTaken) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

  // Ensure a unique slug.
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await db.workspace.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const hashed = await bcrypt.hash(adminPassword, 12);

  const result = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name, slug, status: 'active', createdById: session.user.id },
    });
    const admin = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashed,
        role: 'admin',
        status: 'active',
        workspaceId: workspace.id,
        createdById: session.user.id,
      },
    });
    return { workspace, admin };
  });

  await audit({ userId: session.user.id, action: 'create_workspace', entityType: 'Workspace', entityId: result.workspace.id, details: { adminEmail } });

  return NextResponse.json({
    id: result.workspace.id,
    name: result.workspace.name,
    slug: result.workspace.slug,
    admin: { id: result.admin.id, email: result.admin.email },
  }, { status: 201 });
}
