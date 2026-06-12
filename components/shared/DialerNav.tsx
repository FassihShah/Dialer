'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PhoneCall, Clock, Calendar, LogOut, Users, Phone } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { cn, nameInitials, nameColor } from '@/lib/utils';

const NAV = [
  { href: '/dialer', icon: PhoneCall, label: 'Dialer' },
  { href: '/dialer/crm', icon: Users, label: 'CRM — Leads' },
  { href: '/dialer/history', icon: Clock, label: 'Call History' },
  { href: '/dialer/follow-ups', icon: Calendar, label: 'Follow-ups' },
  { href: '/dialer/my-number', icon: Phone, label: 'My Number' },
];

export default function DialerNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="w-60 flex flex-col bg-gradient-to-b from-navy to-slate-900 border-r border-slate-800/60 h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
        <div className="w-9 h-9 bg-gradient-to-br from-electric-blue to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25">
          <PhoneCall size={17} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm font-bricolage leading-tight tracking-tight">Smart Logics</p>
          <p className="text-slate-400 text-[10px] font-dm">Dialer Workspace</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 px-3 py-4 flex flex-col gap-1">
        <p className="px-3 mb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-dm">Workspace</p>
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== '/dialer' && pathname.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-dm font-medium transition-all active:scale-[0.98]',
                active ? 'bg-electric-blue text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700/60')}>
              <n.icon size={17} className="flex-shrink-0" />
              {n.label}
            </Link>
          );
        })}
      </div>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-slate-800/60 pt-3">
        <div className="flex items-center gap-2.5 mb-2 px-2">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', nameColor(session?.user.name))}>
            {nameInitials(session?.user.name)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium font-dm truncate">{session?.user.name}</p>
            <p className="text-slate-400 text-[10px] font-dm truncate">{session?.user.email}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl text-sm font-dm transition-all active:scale-[0.98]">
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
