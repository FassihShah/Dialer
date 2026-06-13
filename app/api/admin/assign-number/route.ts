import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const schema = z.object({
  userId: z.string(),
  phoneNumberId: z.string().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId, phoneNumberId } = parsed.data;
  const ws = session.user.workspaceId;

  // The target user must belong to the admin's workspace.
  const targetUser = await db.user.findUnique({ where: { id: userId }, select: { workspaceId: true } });
  if (!targetUser || targetUser.workspaceId !== ws) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (phoneNumberId === null) {
    // Unassign
    await db.phoneNumberAssignment.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true, unassigned: true });
  }

  // The number must belong to the admin's workspace too.
  const targetNumber = await db.phoneNumber.findUnique({ where: { id: phoneNumberId }, select: { workspaceId: true } });
  if (!targetNumber || targetNumber.workspaceId !== ws) return NextResponse.json({ error: 'Number not found' }, { status: 404 });

  // Check number isn't already assigned to another user
  const existing = await db.phoneNumberAssignment.findUnique({ where: { phoneNumberId } });
  if (existing && existing.userId !== userId) {
    return NextResponse.json({ error: 'This number is already assigned to another user' }, { status: 409 });
  }

  // Remove any current assignment for this user
  await db.phoneNumberAssignment.deleteMany({ where: { userId } });

  const assignment = await db.phoneNumberAssignment.create({
    data: { userId, phoneNumberId, assignedById: session.user.id },
    include: { phoneNumber: true, user: { select: { name: true, email: true } } },
  });

  await audit({ userId: session.user.id, action: 'assign_number', entityType: 'PhoneNumberAssignment', entityId: assignment.id, details: { userId, phoneNumberId } });
  return NextResponse.json(assignment);
}
