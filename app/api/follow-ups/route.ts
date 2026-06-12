import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  const followUps = await db.followUp.findMany({
    where: { userId: session.user.id, status: status as 'pending' },
    include: { lead: true },
    orderBy: { followUpDate: 'asc' },
  });
  return NextResponse.json(followUps);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await req.json();
  const fu = await db.followUp.findUnique({ where: { id } });
  if (!fu || fu.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await db.followUp.update({ where: { id }, data: { status } });
  return NextResponse.json({ ok: true });
}
