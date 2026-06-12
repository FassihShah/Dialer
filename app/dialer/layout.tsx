import { requireAuth } from '@/lib/permissions';
import DialerNav from '@/components/shared/DialerNav';

export default async function DialerLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <DialerNav />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
