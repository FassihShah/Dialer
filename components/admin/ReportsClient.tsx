'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BarChart3, Phone, Clock, Target, CalendarClock, TrendingUp, Users, Trophy, Download, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportData {
  range: { days: number; since: string };
  kpis: { totalCalls: number; totalTalkSeconds: number; connectedCalls: number; meetingsBooked: number; followUpsCreated: number; avgDuration: number; connectRate: number; conversionRate: number; pendingFollowUps: number };
  outcomeBreakdown: { outcome: string; count: number }[];
  timeSeries: { date: string; calls: number; talk: number; meetings: number }[];
  agents: { id: string; name: string; calls: number; talk: number; meetings: number; connected: number; connectRate: number; conversionRate: number }[];
  leadPipeline: { status: string; count: number }[];
}

const OUTCOME_META: Record<string, { label: string; color: string }> = {
  cold: { label: 'Cold', color: '#3b82f6' },
  warm: { label: 'Warm', color: '#f59e0b' },
  meeting_booked: { label: 'Meeting Booked', color: '#10b981' },
  not_interested: { label: 'Not Interested', color: '#ef4444' },
  callback: { label: 'Callback', color: '#8b5cf6' },
  no_answer: { label: 'No Answer', color: '#94a3b8' },
  do_not_call: { label: 'Do Not Call', color: '#7f1d1d' },
};
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function fmtDuration(sec: number) {
  if (sec <= 0) return '0m';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

const RANGES = [{ d: 7, l: '7 days' }, { d: 30, l: '30 days' }, { d: 90, l: '90 days' }];

export default function ReportsClient() {
  const router = useRouter();
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['admin_reports', days],
    queryFn: () => fetch(`/api/admin/reports?days=${days}`).then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [['Agent', 'Calls', 'Connected', 'Talk Time (s)', 'Meetings', 'Connect %', 'Conversion %']];
    data.agents.forEach((a) => rows.push([a.name, String(a.calls), String(a.connected), String(a.talk), String(a.meetings), String(a.connectRate), String(a.conversionRate)]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `call_report_${days}d.csv`; a.click();
  };

  const kpis = data?.kpis;
  const maxCalls = Math.max(1, ...(data?.timeSeries.map((d) => d.calls) || [1]));
  const maxOutcome = Math.max(1, ...(data?.outcomeBreakdown.map((o) => o.count) || [1]));

  // SVG sparkline/area geometry
  const W = 760, H = 180, P = 8;
  const pts = (data?.timeSeries || []).map((d, i, arr) => {
    const x = P + (i / Math.max(1, arr.length - 1)) * (W - P * 2);
    const y = H - P - (d.calls / maxCalls) * (H - P * 2);
    return { x, y, d };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${H - P} L${pts[0].x.toFixed(1)},${H - P} Z` : '';

  const KPI_CARDS = [
    { label: 'Total Calls', value: kpis?.totalCalls ?? 0, icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Talk Time', value: fmtDuration(kpis?.totalTalkSeconds ?? 0), icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Connect Rate', value: `${kpis?.connectRate ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Meetings Booked', value: kpis?.meetingsBooked ?? 0, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avg Call', value: fmtDuration(kpis?.avgDuration ?? 0), icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Conversion', value: `${kpis?.conversionRate ?? 0}%`, icon: Trophy, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Follow-ups Set', value: kpis?.followUpsCreated ?? 0, icon: CalendarClock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Pending Follow-ups', value: kpis?.pendingFollowUps ?? 0, icon: CalendarClock, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <BarChart3 size={18} className="text-electric-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy font-bricolage">Reports &amp; Analytics</h1>
            <p className="text-xs text-slate-gray font-dm">Calling performance across all agents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            {RANGES.map((r) => (
              <button key={r.d} onClick={() => setDays(r.d)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium font-dm transition-all',
                  days === r.d ? 'bg-white text-navy shadow-sm' : 'text-slate-500 hover:text-navy')}>
                {r.l}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} className="btn-ghost py-2 px-3 text-xs"><Download size={13} /> Export</button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-6 animate-fade-in-up">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {KPI_CARDS.map((c) => (
              <div key={c.label} className="card-premium p-5 hover:shadow-lift transition-shadow">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', c.bg)}>
                  <c.icon size={19} className={c.color} />
                </div>
                <p className="text-2xl font-bold text-navy font-bricolage">{c.value}</p>
                <p className="text-xs text-slate-gray font-dm mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Calls over time chart */}
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-navy font-bricolage">Calls Over Time</h2>
              <span className="text-xs text-slate-gray font-dm">Last {days} days</span>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((g) => (
                <line key={g} x1={P} y1={P + g * (H - P * 2)} x2={W - P} y2={P + g * (H - P * 2)} stroke="#f1f5f9" strokeWidth="1" />
              ))}
              {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
              {linePath && <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#2563EB" />)}
            </svg>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-dm">
              <span>{data?.timeSeries[0]?.date.slice(5)}</span>
              <span>{data?.timeSeries[Math.floor((data?.timeSeries.length || 1) / 2)]?.date.slice(5)}</span>
              <span>{data?.timeSeries[(data?.timeSeries.length || 1) - 1]?.date.slice(5)}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Outcome breakdown */}
            <div className="card-premium p-5">
              <h2 className="text-sm font-bold text-navy font-bricolage mb-4">Outcome Breakdown</h2>
              <div className="space-y-3">
                {data?.outcomeBreakdown.map((o) => {
                  const meta = OUTCOME_META[o.outcome] || { label: o.outcome, color: '#94a3b8' };
                  const pct = Math.round((o.count / maxOutcome) * 100);
                  return (
                    <div key={o.outcome}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-navy font-dm">{meta.label}</span>
                        <span className="text-xs text-slate-gray font-dm tabular-nums">{o.count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: meta.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead pipeline */}
            <div className="card-premium p-5">
              <h2 className="text-sm font-bold text-navy font-bricolage mb-4">Lead Pipeline</h2>
              <div className="grid grid-cols-2 gap-3">
                {data?.leadPipeline.length === 0 && <p className="text-xs text-slate-400 font-dm col-span-2">No leads yet</p>}
                {data?.leadPipeline.map((p) => {
                  const meta = OUTCOME_META[p.status] || { label: label(p.status), color: '#64748b' };
                  return (
                    <div key={p.status} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-navy font-bricolage leading-none">{p.count}</p>
                        <p className="text-[11px] text-slate-gray font-dm truncate">{meta.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Agent leaderboard */}
          <div className="card-premium overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users size={15} className="text-slate-400" />
              <h2 className="text-sm font-bold text-navy font-bricolage">Agent Leaderboard</h2>
              <span className="text-xs text-slate-400 font-dm ml-auto">Click an agent for full stats</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  {['#', 'Agent', 'Calls', 'Connected', 'Talk Time', 'Meetings', 'Connect %', 'Conv %', ''].map((h, idx) => (
                    <th key={idx} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.agents.length ?? 0) === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400 font-dm">No call activity in this period</td></tr>
                ) : data!.agents.map((a, i) => (
                  <tr key={a.id} onClick={() => router.push(`/admin/reports/${a.id}`)}
                    className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <span className={cn('w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold',
                        i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400')}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-navy font-dm group-hover:text-electric-blue transition-colors">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-navy font-dm tabular-nums">{a.calls}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-dm tabular-nums">{a.connected}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-mono tabular-nums">{fmtDuration(a.talk)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 font-dm tabular-nums">{a.meetings}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-dm tabular-nums">{a.connectRate}%</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-dm tabular-nums">{a.conversionRate}%</td>
                    <td className="px-4 py-3 text-slate-300 group-hover:text-electric-blue transition-colors"><ChevronRight size={15} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
