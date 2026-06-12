'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Plus, Upload, Download, X, Phone, Mail, Building2, Globe, Briefcase, MapPin, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/dialer';
import AddLeadModal from './AddLeadModal';
import CSVImportModal from './CSVImportModal';

const STATUSES = ['all', 'new', 'cold', 'warm', 'meeting_booked', 'callback', 'not_interested', 'do_not_call'] as const;
const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', cold: 'bg-slate-100 text-slate-600', warm: 'bg-amber-100 text-amber-700',
  meeting_booked: 'bg-emerald-100 text-emerald-700', callback: 'bg-purple-100 text-purple-700',
  not_interested: 'bg-red-100 text-red-700', do_not_call: 'bg-red-200 text-red-800',
};
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function CRMClient() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detail, setDetail] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['crm_leads', search, status],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (status !== 'all') p.set('status', status);
      return fetch(`/api/leads?${p}`).then((r) => r.json());
    },
  });

  const createLead = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to add lead');
      return j;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm_leads'] }); toast({ title: 'Lead added' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => fetch(`/api/leads/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['crm_leads'] }); setDetail(null); toast({ title: 'Lead deleted' }); },
    onError: () => toast({ title: 'Delete failed', variant: 'destructive' }),
  });

  const exportCsv = () => {
    const p = new URLSearchParams();
    if (status !== 'all') p.set('status', status);
    window.open(`/api/leads/export?${p}`, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-electric-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy font-bricolage">CRM — Leads</h1>
            <p className="text-xs text-slate-gray font-dm">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-gray font-dm hover:bg-slate-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-gray font-dm hover:bg-slate-50 transition-colors">
            <Upload size={14} /> Import
          </button>
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium transition-colors">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, company, phone, email…"
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue" />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium font-dm whitespace-nowrap transition-colors',
                status === s ? 'bg-navy text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
              {s === 'all' ? 'All' : label(s)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Name', 'Company', 'Phone', 'Email', 'Status', 'Calls'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-50"><td colSpan={6} className="px-4 py-3"><div className="h-5 skeleton rounded" /></td></tr>
              ))
            ) : leads.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400 font-dm">No leads found. Add or import leads to get started.</td></tr>
            ) : leads.map((l) => (
              <tr key={l.id} onClick={() => setDetail(l)} className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-semibold text-navy font-dm">{l.fullName}</p>
                  {l.jobTitle && <p className="text-xs text-slate-gray font-dm">{l.jobTitle}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 font-dm">{l.companyName || '—'}</td>
                <td className="px-4 py-3 font-mono text-sm text-navy">{l.phone}</td>
                <td className="px-4 py-3 text-sm text-slate-600 font-dm">{l.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm', STATUS_STYLES[l.status] || 'bg-slate-100 text-slate-600')}>
                    {label(l.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 font-dm">{l.callCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail dialog */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <p className="font-bold text-navy font-bricolage text-lg">{detail.fullName}</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium font-dm', STATUS_STYLES[detail.status] || 'bg-slate-100 text-slate-600')}>
                  {label(detail.status)}
                </span>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {[
                { icon: Phone, label: 'Phone', value: detail.phone },
                { icon: Mail, label: 'Email', value: detail.email },
                { icon: Briefcase, label: 'Job Title', value: detail.jobTitle },
                { icon: Building2, label: 'Company', value: detail.companyName },
                { icon: Globe, label: 'Website', value: detail.companyWebsite },
                { icon: Building2, label: 'Industry', value: detail.industry },
                { icon: MapPin, label: 'Region', value: detail.region },
              ].map((f) => (
                <div key={f.label} className="flex items-start gap-3">
                  <f.icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-dm">{f.label}</p>
                    <p className="text-sm text-navy font-dm break-words">{f.value || '—'}</p>
                  </div>
                </div>
              ))}
              {detail.notes && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-dm mb-1">Notes</p>
                  <p className="text-sm text-slate-700 font-dm whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-gray font-dm pt-1">
                <span>Calls: <span className="font-semibold text-navy">{detail.callCount}</span></span>
                {detail.lastCalledAt && <span>Last: {new Date(detail.lastCalledAt).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-between">
              <button onClick={() => deleteLead.mutate(detail.id)} disabled={deleteLead.isPending}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm rounded-lg font-dm transition-colors disabled:opacity-60">
                <Trash2 size={14} /> Delete
              </button>
              <button onClick={() => setDetail(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-dm transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onAdd={(data) => createLead.mutateAsync(data)} />
      <CSVImportModal open={importOpen} onClose={() => setImportOpen(false)} onRefresh={() => qc.invalidateQueries({ queryKey: ['crm_leads'] })} />
    </div>
  );
}
