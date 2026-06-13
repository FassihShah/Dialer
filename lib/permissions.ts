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
  // Platform owners live in /super, not the per-workspace admin panel.
  if (session.user.role === 'super_admin') redirect('/super');
  if (session.user.role !== 'admin') redirect('/dialer');
  return session;
}

export async function requireSuperAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'super_admin') redirect('/dialer');
  return session;
}

export function isAdmin(session: Session): boolean {
  return session.user.role === 'admin';
}

export function isSuperAdmin(session: Session): boolean {
  return session.user.role === 'super_admin';
}

/**
 * Resolve the caller's workspace id for scoping queries.
 * Returns null for super_admin (cross-tenant). Throws if a non-super user
 * somehow has no workspace — that indicates a provisioning bug.
 */
export function workspaceIdOf(session: Session): string | null {
  if (session.user.role === 'super_admin') return null;
  return session.user.workspaceId ?? null;
}
