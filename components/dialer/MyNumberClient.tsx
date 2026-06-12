'use client';
import { useQuery } from '@tanstack/react-query';
import { Phone, Globe, CheckCircle2, XCircle, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MyNumber {
  hasNumber: boolean;
  number: { phoneNumber: string; label: string | null; country: string | null; status: string; assignedAt: string | null } | null;
  defaultCallerId: string | null;
  callingReady: boolean;
  callingError: string | null;
}

export default function MyNumberClient() {
  const { data, isLoading } = useQuery<MyNumber>({
    queryKey: ['my_number'],
    queryFn: async () => {
      const r = await fetch('/api/me/number');
      if (!r.ok) throw new Error('Failed to load');
      return r.json();
    },
    refetchInterval: 20_000,
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
          <Phone size={18} className="text-electric-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy font-bricolage">My Number</h1>
          <p className="text-xs text-slate-gray font-dm">Your assigned calling number and status</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-blue-200 border-t-electric-blue rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <div className="max-w-xl space-y-4">
          {/* Calling readiness */}
          <div className={cn('rounded-xl border p-4 flex items-center gap-3',
            data.callingReady ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
            {data.callingReady
              ? <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
              : <XCircle size={20} className="text-amber-600 flex-shrink-0" />}
            <div>
              <p className={cn('text-sm font-semibold font-dm', data.callingReady ? 'text-emerald-800' : 'text-amber-800')}>
                {data.callingReady ? 'Calling is ready' : 'Calling not ready'}
              </p>
              <p className={cn('text-xs font-dm', data.callingReady ? 'text-emerald-700' : 'text-amber-700')}>
                {data.callingReady ? 'You can place calls from the Dialer.' : (data.callingError || 'Contact your admin.')}
              </p>
            </div>
          </div>

          {/* Assigned number card */}
          {data.hasNumber && data.number ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-navy px-6 py-5 flex items-center gap-4">
                <div className="w-12 h-12 bg-electric-blue rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white font-mono tracking-wide">{data.number.phoneNumber}</p>
                  {data.number.label && <p className="text-xs text-slate-300 font-dm">{data.number.label}</p>}
                </div>
                <span className={cn('ml-auto text-xs px-2.5 py-1 rounded-full font-medium font-dm',
                  data.number.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-300')}>
                  {data.number.status}
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe size={12} className="text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-dm">Country</p>
                  </div>
                  <p className="text-sm font-medium text-navy font-dm">{data.number.country || '—'}</p>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ShieldCheck size={12} className="text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-dm">Assigned</p>
                  </div>
                  <p className="text-sm font-medium text-navy font-dm">
                    {data.number.assignedAt ? new Date(data.number.assignedAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
              <Phone size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-navy font-dm">No personal number assigned</p>
              <p className="text-xs text-slate-500 font-dm mt-1">
                {data.defaultCallerId
                  ? <>Your calls use the shared caller ID <span className="font-mono text-navy">{data.defaultCallerId}</span>.</>
                  : 'Ask your admin to assign you a number.'}
              </p>
            </div>
          )}

          {/* Default caller id note when a personal number exists */}
          {data.hasNumber && data.defaultCallerId && (
            <div className="flex items-start gap-2 text-xs text-slate-500 font-dm px-1">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              <p>If your number is ever unavailable, calls fall back to the shared caller ID <span className="font-mono text-navy">{data.defaultCallerId}</span>.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
