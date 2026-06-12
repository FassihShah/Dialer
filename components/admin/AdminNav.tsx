'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Phone, Settings, LogOut, PhoneCall, Activity, BarChart3 } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { cn, nameInitials, nameColor } from '@/lib/utils';

const NAV = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/numbers', icon: Phone, label: 'Phone Numbers' },
  { href: '/admin/status', icon: Activity, label: 'Live Status' },
  { href: '/admin/settings', icon: Settings, label: 'Dialer Settings' },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="w-56 flex flex-col bg-gradient-to-b from-navy to-slate-900 border-r border-slate-800/60 h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-electric-blue rounded-lg flex items-center justify-center flex-shrink-0">
          <PhoneCall size={15} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm font-bricolage leading-tight">Smart Logics</p>
          <p className="text-slate-400 text-[10px] font-dm">Admin Panel</p>
        </div>
      </div>

      <div className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-dm transition-all active:scale-[0.98]',
                active ? 'bg-electric-blue text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700/70')}>
              <n.icon size={16} />
              {n.label}
            </Link>
          );
        })}
      </div>

      <div className="px-3 pb-4 border-t border-slate-800 pt-3">
        <div className="flex items-center gap-2 mb-2 px-2">
          <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', nameColor(session?.user.name))}>
            {nameInitials(session?.user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium font-dm truncate">{session?.user.name}</p>
            <p className="text-slate-400 text-[10px] font-dm">Admin</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl text-sm font-dm transition-all">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
