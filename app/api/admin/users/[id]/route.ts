import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['admin', 'user']).optional(),
  status: z.enum(['active', 'suspended', 'pending']).optional(),
  agentPhone: z.string().optional().nullable(),
  subscriberReference: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (data.password) {
    data.password = await bcrypt.hash(data.password as string, 12);
  }

  const user = await db.user.update({ where: { id }, data });
  await audit({ userId: session.user.id, action: 'update_user', entityType: 'User', entityId: id });
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role, status: user.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  if (id === session.user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

  await db.user.update({ where: { id }, data: { status: 'suspended' } });
  await audit({ userId: session.user.id, action: 'suspend_user', entityType: 'User', entityId: id });
  return NextResponse.json({ ok: true });
}
