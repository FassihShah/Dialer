'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft, Phone, Clock, Target, TrendingUp, CalendarClock, Users, BarChart3 } from 'lucide-react';
import { cn, nameInitials, nameColor } from '@/lib/utils';

interface UserReport {
  user: { id: string; name: string; email: string; role: string; status: string; createdAt: string; assignedNumber: string | null };
  range: { days: number };
  kpis: { totalCalls: number; totalTalkSeconds: number; connectedCalls: number; meetingsBooked: number; followUpsCreated: number; avgDuration: number; connectRate: number; conversionRate: number; totalLeads: number; pendingFollowUps: number };
  outcomeBreakdown: { outcome: string; count: number }[];
  timeSeries: { date: string; calls: number }[];
  recentCalls: { id: string; durationSeconds: number; outcome: string | null; dateTime: string; leadName: string | null; leadCompany: string | null; calledFromNumber: string | null }[];
}

const OUTCOME_META: Record<string, { label: string; color: string; chip: string }> = {
  cold: { label: 'Cold', color: '#3b82f6', chip: 'bg-blue-100 text-blue-800' },
  warm: { label: 'Warm', color: '#f59e0b', chip: 'bg-amber-100 text-amber-800' },
  meeting_booked: { label: 'Meeting Booked', color: '#10b981', chip: 'bg-emerald-100 text-emerald-800' },
  not_interested: { label: 'Not Interested', color: '#ef4444', chip: 'bg-red-100 text-red-800' },
  callback: { label: 'Callback', color: '#8b5cf6', chip: 'bg-purple-100 text-purple-800' },
  no_answer: { label: 'No Answer', color: '#94a3b8', chip: 'bg-slate-100 text-slate-700' },
  do_not_call: { label: 'Do Not Call', color: '#7f1d1d', chip: 'bg-red-200 text-red-900' },
};

function fmtDuration(sec: number) {
  if (sec <= 0) return '0m';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

const RANGES = [{ d: 7, l: '7 days' }, { d: 30, l: '30 days' }, { d: 90, l: '90 days' }];

export default function UserReportClient({ userId }: { userId: string }) {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<UserReport>({
    queryKey: ['admin_user_report', userId, days],
    queryFn: () => fetch(`/api/admin/reports/${userId}?days=${days}`).then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const k = data?.kpis;
  const maxCalls = Math.max(1, ...(data?.timeSeries.map((d) => d.calls) || [1]));
  const maxOutcome = Math.max(1, ...(data?.outcomeBreakdown.map((o) => o.count) || [1]));

  const KPIS = [
    { label: 'Total Calls', value: k?.totalCalls ?? 0, icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Talk Time', value: fmtDuration(k?.totalTalkSeconds ?? 0), icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Connect Rate', value: `${k?.connectRate ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Meetings', value: k?.meetingsBooked ?? 0, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avg Call', value: fmtDuration(k?.avgDuration ?? 0), icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Conversion', value: `${k?.conversionRate ?? 0}%`, icon: Target, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Total Leads', value: k?.totalLeads ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Follow-ups', value: k?.pendingFollowUps ?? 0, icon: CalendarClock, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <Link href="/admin/reports" className="inline-flex items-center gap-1.5 text-sm text-electric-blue font-dm font-medium mb-4 hover:gap-2.5 transition-all">
        <ArrowLeft size={15} /> Back to Reports
      </Link>

      {isLoading || !data?.user ? (
        <div className="grid grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-6 animate-fade-in-up">
          {/* Profile header */}
          <div className="card-premium p-5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold', nameColor(data.user.name))}>
                {nameInitials(data.user.name)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-navy font-bricolage">{data.user.name}</h1>
                <p className="text-sm text-slate-gray font-dm">{data.user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium font-dm capitalize',
                    data.user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>{data.user.status}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium font-dm bg-slate-100 text-slate-600 capitalize">{data.user.role}</span>
                  {data.user.assignedNumber && <span className="text-xs font-mono text-slate-500 flex items-center gap-1"><Phone size={11} /> {data.user.assignedNumber}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              {RANGES.map((r) => (
                <button key={r.d} onClick={() => setDays(r.d)}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-medium font-dm transition-all', days === r.d ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy')}>
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KPIS.map((c) => (
              <div key={c.label} className="card-premium p-5 hover:shadow-lift transition-shadow">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg)}><c.icon size={19} className={c.color} /></div>
                <p className="text-2xl font-bold text-navy font-bricolage">{c.value}</p>
                <p className="text-xs text-slate-gray font-dm mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Calls over time (mini bars) */}
            <div className="card-premium p-5">
              <h2 className="text-sm font-bold text-navy font-bricolage mb-4">Calls Over Time</h2>
              <div className="flex items-end gap-0.5 h-32">
                {data.timeSeries.map((d) => (
                  <div key={d.date} className="flex-1 group relative flex items-end" style={{ height: '100%' }}>
                    <div className="w-full bg-electric-blue/80 hover:bg-electric-blue rounded-t transition-all" style={{ height: `${(d.calls / maxCalls) * 100}%`, minHeight: d.calls ? 2 : 0 }} title={`${d.date}: ${d.calls} calls`} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-dm">
                <span>{data.timeSeries[0]?.date.slice(5)}</span>
                <span>{data.timeSeries[data.timeSeries.length - 1]?.date.slice(5)}</span>
              </div>
            </div>

            {/* Outcomes */}
            <div className="card-premium p-5">
              <h2 className="text-sm font-bold text-navy font-bricolage mb-4">Outcome Breakdown</h2>
              <div className="space-y-3">
                {data.outcomeBreakdown.map((o) => {
                  const meta = OUTCOME_META[o.outcome];
                  return (
                    <div key={o.outcome}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-navy font-dm">{meta.label}</span>
                        <span className="text-xs text-slate-gray font-dm tabular-nums">{o.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(o.count / maxOutcome) * 100}%`, backgroundColor: meta.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent calls */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-navy font-bricolage">Recent Calls</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  {['Date', 'Lead', 'Duration', 'Outcome', 'From'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentCalls.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400 font-dm">No calls in this period</td></tr>
                ) : data.recentCalls.map((c) => {
                  const meta = c.outcome ? OUTCOME_META[c.outcome] : null;
                  return (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-gray font-dm whitespace-nowrap">{new Date(c.dateTime).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-navy font-dm">{c.leadName || '—'}</p>
                        {c.leadCompany && <p className="text-xs text-slate-gray font-dm">{c.leadCompany}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-navy tabular-nums">{fmtDuration(c.durationSeconds)}</td>
                      <td className="px-4 py-3">{meta && <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm', meta.chip)}>{meta.label}</span>}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{c.calledFromNumber || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
