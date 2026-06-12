import { requireAdmin } from '@/lib/permissions';
import AdminNav from '@/components/admin/AdminNav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminNav />
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
