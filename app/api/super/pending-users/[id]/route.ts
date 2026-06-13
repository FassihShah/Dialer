import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const placeSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  role: z.enum(['admin', 'user']).default('user'),
});

// Place an unassigned user into a workspace and activate them.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = placeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid input' }, { status: 400 });

  // Only act on genuinely unassigned, non-super users.
  const target = await db.user.findUnique({ where: { id }, select: { workspaceId: true, role: true } });
  if (!target || target.workspaceId !== null || target.role === 'super_admin') {
    return NextResponse.json({ error: 'User not found or already placed' }, { status: 404 });
  }

  const workspace = await db.workspace.findUnique({ where: { id: parsed.data.workspaceId }, select: { id: true } });
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const user = await db.user.update({
    where: { id },
    data: { workspaceId: workspace.id, role: parsed.data.role, status: 'active', createdById: session.user.id },
  });

  await audit({ userId: session.user.id, action: 'place_user', entityType: 'User', entityId: id, details: { workspaceId: workspace.id, role: parsed.data.role } });
  return NextResponse.json({ id: user.id, email: user.email, workspaceId: user.workspaceId, role: user.role, status: user.status });
}

// Reject an unassigned user (suspend the account).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const target = await db.user.findUnique({ where: { id }, select: { workspaceId: true, role: true } });
  if (!target || target.workspaceId !== null || target.role === 'super_admin') {
    return NextResponse.json({ error: 'User not found or already placed' }, { status: 404 });
  }

  await db.user.update({ where: { id }, data: { status: 'suspended' } });
  await audit({ userId: session.user.id, action: 'reject_user', entityType: 'User', entityId: id });
  return NextResponse.json({ ok: true });
}
