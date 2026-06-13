import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Users who registered themselves but have not been placed into a workspace yet.
// (Workspace admins approve pending users *within* their own workspace; the
// super-admin only handles unassigned accounts.)
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await db.user.findMany({
    where: { workspaceId: null, role: { not: 'super_admin' } },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(users);
}
