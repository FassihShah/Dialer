import { auth } from './auth';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';

export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.status === 'pending') redirect('/pending');
  if (session.user.status === 'suspended') redirect('/login');
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') redirect('/dialer');
  return session;
}

export function isAdmin(session: Session): boolean {
  return session.user.role === 'admin';
}
