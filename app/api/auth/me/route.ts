import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Returns the live DB status for the current user — used by the pending page
// to detect approval without relying on the (potentially stale) JWT cookie.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { status: true, workspaceId: true, role: true },
  });

  if (!user) return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });
  return NextResponse.json({ status: user.status, workspaceId: user.workspaceId, role: user.role });
}
