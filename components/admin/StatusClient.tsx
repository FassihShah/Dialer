'use client';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, XCircle, RefreshCw, Phone, Globe, Hash, User, AlertTriangle, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Check { ok: boolean; detail?: string }
interface SWNumber {
  phoneNumber: string; friendlyName: string | null; sid: string;
  voiceEnabled: boolean; syncedToDb: boolean; status: string | null;
  assignedTo: string | null; assignedEmail: string | null;
}
interface StatusData {
  configured: boolean;
  checkedAt: string;
  spaceUrl?: string;
  projectId?: string;
  dialAddress?: string | null;
  defaultCallerId?: string | null;
  defaultCallerIdValid?: boolean | null;
  sharedSubscriberReference?: string | null;
  checks?: { apiConnection: Check; browserCalling: Check; numbersApi: Check };
  numbers?: SWNumber[];
  counts?: { total: number; synced: number; assigned: number; voiceEnabled: number };
}

function CheckRow({ label, check }: { label: string; check?: Check }) {
  const ok = check?.ok;
  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
        ok ? 'bg-emerald-100' : 'bg-red-100')}>
        {ok ? <CheckCircle2 size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy font-dm">{label}</p>
        <p className={cn('text-xs font-dm mt-0.5 break-words', ok ? 'text-slate-500' : 'text-red-600')}>
          {check?.detail || (ok ? 'OK' : 'Not working')}
        </p>
      </div>
      <span className={cn('ml-auto text-xs font-medium px-2 py-1 rounded-full font-dm flex-shrink-0',
        ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
        {ok ? 'Live' : 'Down'}
      </span>
    </div>
  );
}

export default function StatusClient() {
  const { data, isLoading, isFetching, refetch, error } = useQuery<StatusData>({
    queryKey: ['signalwire_status'],
    queryFn: async () => {
      const r = await fetch('/api/signalwire/status');
      if (!r.ok) throw new Error('Failed to load status');
      return r.json();
    },
    refetchInterval: 15_000, // live: auto-refresh every 15s
    refetchOnWindowFocus: true,
  });

  const allOk = data?.checks && Object.values(data.checks).every((c) => c.ok);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Activity size={18} className="text-electric-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy font-bricolage">Live Status</h1>
            <p className="text-xs text-slate-gray font-dm">
              SignalWire connection & phone number health
              {data?.checkedAt && <span className="ml-1">· updated {new Date(data.checkedAt).toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-dm transition-all disabled:opacity-60">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-blue-200 border-t-electric-blue rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-dm">
          Failed to load live status. Try refreshing.
        </div>
      )}

      {data && !data.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 font-dm">SignalWire not configured</p>
            <p className="text-xs text-amber-700 font-dm mt-1">Go to Dialer Settings and enter your SignalWire credentials, then save.</p>
          </div>
        </div>
      )}

      {data && data.configured && (
        <>
          {/* Overall banner */}
          <div className={cn('rounded-xl p-4 mb-5 flex items-center gap-3 border',
            allOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
            <Radio size={18} className={allOk ? 'text-emerald-600' : 'text-amber-600'} />
            <p className={cn('text-sm font-semibold font-dm', allOk ? 'text-emerald-800' : 'text-amber-800')}>
              {allOk ? 'All systems operational — dialer is ready to make calls' : 'Some checks are failing — see details below'}
            </p>
            {isFetching && <span className="ml-auto text-xs text-slate-400 font-dm">refreshing…</span>}
          </div>

          {/* Health checks */}
          <div className="grid gap-3 mb-6">
            <CheckRow label="API Connection" check={data.checks?.apiConnection} />
            <CheckRow label="Browser Calling (Subscriber Token)" check={data.checks?.browserCalling} />
            <CheckRow label="Phone Numbers API" check={data.checks?.numbersApi} />
          </div>

          {/* Config summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Globe, label: 'Space', value: data.spaceUrl || '—' },
              { icon: Phone, label: 'Default Caller ID', value: data.defaultCallerId || '—',
                warn: data.defaultCallerId && data.defaultCallerIdValid === false ? 'Not found in account' : null },
              { icon: Hash, label: 'Dial Address', value: data.dialAddress || '—' },
              { icon: User, label: 'Shared Subscriber', value: data.sharedSubscriberReference || '—' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <c.icon size={12} className="text-slate-400" />
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-dm">{c.label}</p>
                </div>
                <p className="text-sm font-medium text-navy font-dm font-mono break-all">{c.value}</p>
                {c.warn && <p className="text-[10px] text-red-600 font-dm mt-1">⚠ {c.warn}</p>}
              </div>
            ))}
          </div>

          {/* Numbers table */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-navy font-bricolage">Phone Numbers (live from SignalWire)</h2>
            {data.counts && (
              <p className="text-xs text-slate-gray font-dm">
                {data.counts.total} total · {data.counts.voiceEnabled} voice · {data.counts.synced} synced · {data.counts.assigned} assigned
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Number', 'Name', 'Voice', 'Synced', 'Assigned To'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.numbers?.length ?? 0) === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400 font-dm">No numbers on this SignalWire account</td></tr>
                ) : data.numbers!.map((n) => (
                  <tr key={n.sid} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-mono text-sm text-navy font-semibold">{n.phoneNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-dm">{n.friendlyName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium font-dm',
                        n.voiceEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {n.voiceEnabled ? 'Enabled' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {n.syncedToDb
                        ? <CheckCircle2 size={15} className="text-emerald-500" />
                        : <span className="text-xs text-amber-600 font-dm">Not synced</span>}
                    </td>
                    <td className="px-4 py-3">
                      {n.assignedTo
                        ? <div><p className="text-sm text-navy font-medium font-dm">{n.assignedTo}</p><p className="text-xs text-slate-gray font-dm">{n.assignedEmail}</p></div>
                        : <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-dm">Unassigned</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
