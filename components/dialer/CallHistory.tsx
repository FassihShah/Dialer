'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatDuration } from '@/lib/utils';

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  cold:           { label: 'Cold',           bg: 'bg-blue-50',    text: 'text-blue-700' },
  warm:           { label: 'Warm',           bg: 'bg-amber-50',   text: 'text-amber-700' },
  meeting_booked: { label: 'Meeting Booked', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  not_interested: { label: 'Not Interested', bg: 'bg-red-50',     text: 'text-red-700' },
  callback:       { label: 'Callback',       bg: 'bg-purple-50',  text: 'text-purple-700' },
  no_answer:      { label: 'No Answer',      bg: 'bg-slate-100',  text: 'text-slate-600' },
  do_not_call:    { label: 'Do Not Call',    bg: 'bg-red-100',    text: 'text-red-900' },
};

interface CallLog {
  id: string; leadName: string | null; leadCompany: string | null; dateTime: string;
  durationSeconds: number; outcome: string | null; calledFromNumber: string | null; notes: string | null;
}

export default function CallHistory() {
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  const { data: logs = [], isLoading } = useQuery<CallLog[]>({
    queryKey: ['call_logs', search, outcomeFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (outcomeFilter) p.set('outcome', outcomeFilter);
      return fetch(`/api/calls/logs?${p}`).then((r) => r.json());
    },
  });

  const exportCSV = () => {
    const rows = [['Date', 'Lead', 'Company', 'Duration', 'Outcome', 'Called From', 'Notes']];
    logs.forEach((l) => rows.push([
      l.dateTime ? format(new Date(l.dateTime), 'dd MMM yyyy HH:mm') : '',
      l.leadName || '', l.leadCompany || '', formatDuration(l.durationSeconds),
      l.outcome || '', l.calledFromNumber || '', (l.notes || '').replace(/\n/g, ' '),
    ]));
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'call_history.csv'; a.click();
  };

  return (
    <div className="flex flex-col h-full gap-3 p-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lead, company..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue" />
        </div>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm bg-white focus:outline-none focus:border-electric-blue">
          <option value="">All Outcomes</option>
          {Object.entries(OUTCOME_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-gray font-dm hover:bg-slate-50">
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="flex-1 overflow-y-auto card-premium">
        {isLoading ? (
          <div className="space-y-2 p-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-gray font-dm text-sm">No call records found</div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50/95 backdrop-blur">
                {['Date', 'Lead', 'Duration', 'Outcome', 'Called From', 'Notes'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm border-b border-slate-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const oc = log.outcome ? OUTCOME_CONFIG[log.outcome] : null;
                return (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-xs text-slate-gray font-dm whitespace-nowrap">
                      {log.dateTime ? format(new Date(log.dateTime), 'MMM d, HH:mm') : '—'}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-navy font-dm">{log.leadName || 'Unknown'}</p>
                      {log.leadCompany && <p className="text-xs text-slate-gray font-dm">{log.leadCompany}</p>}
                    </td>
                    <td className="px-3 py-3 text-sm text-navy font-mono whitespace-nowrap">{formatDuration(log.durationSeconds)}</td>
                    <td className="px-3 py-3">
                      {oc && <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm', oc.bg, oc.text)}>{oc.label}</span>}
                    </td>
                    <td className="px-3 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{log.calledFromNumber || '—'}</td>
                    <td className="px-3 py-3 text-xs text-slate-gray font-dm max-w-xs">
                      <p className="truncate" title={log.notes || ''}>{log.notes || '—'}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
