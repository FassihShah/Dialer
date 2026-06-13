import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

  const updated = await db.workspace.update({ where: { id }, data: parsed.data });

  // Suspending a workspace suspends all its users (cuts off login). Reactivating
  // restores them to active. Mirrors how a tenant is enabled/disabled wholesale.
  if (parsed.data.status) {
    await db.user.updateMany({ where: { workspaceId: id }, data: { status: parsed.data.status } });
  }

  await audit({ userId: session.user.id, action: 'update_workspace', entityType: 'Workspace', entityId: id, details: parsed.data });
  return NextResponse.json({ id: updated.id, name: updated.name, status: updated.status });
}
