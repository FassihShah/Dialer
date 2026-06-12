'use client';
import { useState } from 'react';
import { Search, PhoneCall, Clock, CheckCircle, Circle } from 'lucide-react';
import { cn, nameInitials, nameColor } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Lead } from '@/types/dialer';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:             { label: 'New',           bg: 'bg-slate-100',    text: 'text-slate-700',   dot: 'bg-slate-400' },
  cold:            { label: 'Cold',          bg: 'bg-blue-100',     text: 'text-blue-700',    dot: 'bg-blue-500' },
  warm:            { label: 'Warm',          bg: 'bg-amber-100',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  meeting_booked:  { label: 'Meeting',       bg: 'bg-emerald-100',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
  not_interested:  { label: 'Not Interested',bg: 'bg-red-100',      text: 'text-red-700',     dot: 'bg-red-500' },
  callback:        { label: 'Callback',      bg: 'bg-purple-100',   text: 'text-purple-700',  dot: 'bg-purple-500' },
  do_not_call:     { label: 'DNC',           bg: 'bg-red-200',      text: 'text-red-900',     dot: 'bg-red-700' },
};

const STATUS_OPTIONS = ['all', ...Object.keys(STATUS_CONFIG)];

const QUICK_FILTERS = [
  { id: 'not_called', label: 'Not Called', fn: (l: Lead) => !l.calledInSession },
  { id: 'followup_today', label: 'Follow-up Today', fn: (l: Lead) => l.followUpDate === new Date().toISOString().split('T')[0] },
  { id: 'warm', label: 'Warm', fn: (l: Lead) => l.status === 'warm' },
  { id: 'callback', label: 'Callbacks', fn: (l: Lead) => l.status === 'callback' },
  { id: 'all', label: 'All', fn: () => true },
];

export default function LeadListPanel({ leads, selectedLead, onSelect, onCall, mode, isLoading }: {
  leads: Lead[]; selectedLead: Lead | null; onSelect: (l: Lead) => void;
  onCall: (l: Lead) => void; mode: 'auto' | 'manual'; isLoading: boolean;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('not_called');

  const qf = QUICK_FILTERS.find((f) => f.id === quickFilter);
  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.fullName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.phone?.includes(q);
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchQuick = !qf || qf.fn(l);
    return matchSearch && matchStatus && matchQuick;
  });

  const remaining = leads.filter((l) => !l.calledInSession && l.status !== 'do_not_call').length;

  return (
    <div className="w-[360px] flex-shrink-0 flex flex-col border-r border-slate-200 bg-white">
      <div className="px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, phone..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg font-dm focus:outline-none focus:border-electric-blue" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-dm bg-white focus:outline-none focus:border-electric-blue mb-2">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : STATUS_CONFIG[s]?.label || s}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {QUICK_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setQuickFilter(f.id)}
              className={cn('px-2 py-1 text-[10px] rounded-full font-dm font-medium transition-colors',
                quickFilter === f.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-gray font-dm">{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</p>
          {mode === 'auto' && <p className="text-xs text-electric-blue font-dm font-medium">{remaining} remaining</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-0.5 p-2">{[...Array(6)].map((_, i) => <div key={i} className="h-20 skeleton rounded-lg" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4"><p className="text-sm text-slate-gray font-dm">No leads match your filters</p></div>
        ) : (
          filtered.map((lead) => {
            const s = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
            const isSelected = selectedLead?.id === lead.id;
            return (
              <div key={lead.id} onClick={() => onSelect(lead)}
                className={cn('px-3 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors relative group',
                  isSelected && 'bg-blue-50 border-l-2 border-l-electric-blue')}>
                <div className="flex items-start gap-2.5">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', nameColor(lead.fullName))}>
                    {nameInitials(lead.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('font-semibold text-sm font-dm truncate', lead.calledInSession ? 'text-slate-400' : 'text-navy')}>{lead.fullName}</p>
                      {lead.calledInSession && <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />}
                    </div>
                    {lead.companyName && <p className="text-xs text-slate-gray font-dm truncate">{lead.companyName}</p>}
                    <p className="text-xs font-mono text-slate-500 mt-0.5">{lead.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-dm font-medium', s.bg, s.text)}>{s.label}</span>
                      {lead.callCount > 0 && <span className="text-[10px] text-slate-400 font-dm">{lead.callCount}× called</span>}
                      {lead.lastCalledAt && <span className="text-[10px] text-slate-400 font-dm">{formatDistanceToNow(new Date(lead.lastCalledAt), { addSuffix: true })}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onCall(lead); }}
                    disabled={lead.status === 'do_not_call'}
                    className={cn('opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all',
                      lead.status === 'do_not_call' ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-electric-blue text-white hover:bg-blue-700 shadow-sm')}>
                    <PhoneCall size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
