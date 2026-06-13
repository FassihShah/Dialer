import { requireSuperAdmin } from '@/lib/permissions';
import { signOut } from '@/lib/auth';
import { Building2, LogOut } from 'lucide-react';

export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSuperAdmin();
  return (
    <div className="flex flex-col h-screen bg-canvas overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 bg-navy text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Building2 size={20} className="text-electric-blue" />
          <div>
            <h1 className="text-base font-bold font-bricolage leading-tight">Platform Admin</h1>
            <p className="text-[11px] text-slate-300 font-dm leading-tight">Workspace provisioning</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 font-dm">{session.user.email}</span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
            <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-dm transition-colors">
              <LogOut size={13} /> Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
    </div>
  );
}
