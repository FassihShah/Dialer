import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/permissions';
import DialerNav from '@/components/shared/DialerNav';

export default async function DialerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  // Platform super-admins have no workspace and can't dial — send them home.
  if (session.user.role === 'super_admin') redirect('/super');
  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <DialerNav />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
