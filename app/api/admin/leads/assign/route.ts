import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  leadIds: z.array(z.string()).min(1),
  assignedToId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ws = session.user.workspaceId;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { leadIds, assignedToId } = parsed.data;

  // Verify the target user belongs to this workspace (if assigning)
  if (assignedToId) {
    const targetUser = await db.user.findUnique({ where: { id: assignedToId } });
    if (!targetUser || targetUser.workspaceId !== ws) {
      return NextResponse.json({ error: 'User not found in this workspace' }, { status: 400 });
    }
  }

  // Only update leads that belong to this workspace
  const result = await db.lead.updateMany({
    where: { id: { in: leadIds }, workspaceId: ws },
    data: { assignedToId },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
