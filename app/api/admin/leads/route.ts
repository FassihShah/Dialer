import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ws = session.user.workspaceId;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const assignedToId = searchParams.get('assignedToId') || '';
  const limit = parseInt(searchParams.get('limit') || '500');

  const where: Record<string, unknown> = { workspaceId: ws };
  if (status && status !== 'all') where.status = status;
  if (assignedToId === 'unassigned') where.assignedToId = null;
  else if (assignedToId) where.assignedToId = assignedToId;
  if (search) {
    where.AND = [
      { workspaceId: ws },
      {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
    ];
    delete where.workspaceId;
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(leads);
}
