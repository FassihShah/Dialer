import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const entries = await db.dNCEntry.findMany({ where: { workspaceId: session.user.workspaceId }, orderBy: { createdAt: 'desc' }, take: 500 });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const entry = await db.dNCEntry.create({
    data: { ...body, addedById: session.user.id, workspaceId: session.user.workspaceId },
  });
  return NextResponse.json(entry);
}
