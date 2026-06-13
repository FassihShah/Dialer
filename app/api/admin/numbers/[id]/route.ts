import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const target = await db.phoneNumber.findUnique({ where: { id }, select: { workspaceId: true } });
  if (!target || target.workspaceId !== session.user.workspaceId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Remove assignment first
  await db.phoneNumberAssignment.deleteMany({ where: { phoneNumberId: id } });
  await db.phoneNumber.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
