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
    <nav className="w-16 flex flex-col items-center py-4 bg-gradient-to-b from-navy to-slate-900 border-r border-slate-800/60">
      <div className="w-9 h-9 bg-electric-blue rounded-xl flex items-center justify-center mb-6 flex-shrink-0">
        <PhoneCall size={18} className="text-white" />
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full px-2">
        {NAV.map((n) => {
          const active = pathname === n.href || (n.href !== '/dialer' && pathname.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href} title={n.label}
              className={cn('w-full aspect-square rounded-xl flex items-center justify-center transition-all active:scale-95',
                active ? 'bg-electric-blue text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700/70')}>
              <n.icon size={18} />
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 px-2">
        <button onClick={() => signOut({ callbackUrl: '/login' })} title="Sign out"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all">
          <LogOut size={16} />
        </button>
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', nameColor(session?.user.name))}>
          {nameInitials(session?.user.name)}
        </div>
      </div>
    </nav>
  );
}
