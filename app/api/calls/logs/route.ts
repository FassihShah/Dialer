import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outcome = searchParams.get('outcome') || '';
  const search = searchParams.get('search') || '';

  const where: Record<string, unknown> = { userId: session.user.id };
  if (outcome) where.outcome = outcome;
  if (search) {
    where.OR = [
      { leadName: { contains: search, mode: 'insensitive' } },
      { leadCompany: { contains: search, mode: 'insensitive' } },
    ];
  }

  const logs = await db.callLog.findMany({
    where,
    orderBy: { dateTime: 'desc' },
    take: 200,
    include: { lead: { select: { id: true, phone: true } } },
  });
  return NextResponse.json(logs);
}
