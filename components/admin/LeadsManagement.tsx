'use client';
import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users, CheckSquare, Square, ChevronDown, UserCheck, UserX, RefreshCw, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import CSVImportModal from '@/components/dialer/CSVImportModal';

interface AgentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface AdminLead {
  id: string;
  fullName: string;
  companyName: string | null;
  phone: string;
  email: string | null;
  status: string;
  callCount: number;
  lastCalledAt: string | null;
  assignedToId: string | null;
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  new:            'bg-slate-100 text-slate-700',
  cold:           'bg-blue-100 text-blue-700',
  warm:           'bg-amber-100 text-amber-700',
  meeting_booked: 'bg-emerald-100 text-emerald-700',
  not_interested: 'bg-red-100 text-red-700',
  callback:       'bg-purple-100 text-purple-700',
  do_not_call:    'bg-red-200 text-red-900',
};

export default function LeadsManagement() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [assignDropdownOpen, setAssignDropdownOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const { data: leads = [], isLoading, refetch } = useQuery<AdminLead[]>({
    queryKey: ['admin_leads', search, statusFilter, assignedFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      if (assignedFilter) p.set('assignedToId', assignedFilter);
      p.set('limit', '500');
      return fetch(`/api/admin/leads?${p}`).then((r) => r.json());
    },
    staleTime: 10_000,
  });

  const { data: users = [] } = useQuery<AgentUser[]>({
    queryKey: ['admin_users'],
    queryFn: () => fetch('/api/admin/users').then((r) => r.json()),
    staleTime: 60_000,
  });

  const agents = users.filter((u) => u.role === 'user' && u.status === 'active');

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  };

  const handleAssign = async (assignedToId: string | null) => {
    if (selected.size === 0) return;
    setAssigning(true);
    setAssignDropdownOpen(false);
    await fetch('/api/admin/leads/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds: Array.from(selected), assignedToId }),
    });
    setSelected(new Set());
    setAssigning(false);
    qc.invalidateQueries({ queryKey: ['admin_leads'] });
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = leads.length;
    const assigned = leads.filter((l) => l.assignedToId).length;
    const unassigned = total - assigned;
    const called = leads.filter((l) => l.callCount > 0).length;
    return { total, assigned, unassigned, called };
  }, [leads]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy font-bricolage">Lead Management</h1>
          <p className="text-sm text-slate-gray font-dm mt-0.5">Import leads, assign them to agents, and track progress</p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-xl font-dm font-medium transition-colors shadow-md shadow-blue-500/20">
          <Upload size={15} /> Import CSV
        </button>
      </div>

      <CSVImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['admin_leads'] })}
      />

      {/* Stats */}
      <div className="px-8 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Leads',  value: stats.total,      color: 'text-navy' },
            { label: 'Assigned',     value: stats.assigned,   color: 'text-emerald-600' },
            { label: 'Unassigned',   value: stats.unassigned, color: 'text-amber-600' },
            { label: 'Called',       value: stats.called,     color: 'text-electric-blue' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3 text-center">
              <p className={cn('text-2xl font-bold font-bricolage', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-gray font-dm mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-3 border-b border-slate-100 bg-white flex-shrink-0 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm bg-white focus:outline-none focus:border-electric-blue">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="cold">Cold</option>
          <option value="warm">Warm</option>
          <option value="meeting_booked">Meeting Booked</option>
          <option value="not_interested">Not Interested</option>
          <option value="callback">Callback</option>
          <option value="do_not_call">Do Not Call</option>
        </select>

        {/* Assignment filter */}
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm bg-white focus:outline-none focus:border-electric-blue">
          <option value="">All Leads</option>
          <option value="unassigned">Unassigned Only</option>
          {agents.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <button onClick={() => refetch()} className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} />
        </button>

        {/* Bulk assign */}
        {selected.size > 0 && (
          <div className="relative ml-auto">
            <button
              onClick={() => setAssignDropdownOpen((v) => !v)}
              disabled={assigning}
              className="flex items-center gap-2 px-4 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium disabled:opacity-60 transition-colors">
              <UserCheck size={14} />
              {assigning ? 'Assigning...' : `Assign ${selected.size} Lead${selected.size !== 1 ? 's' : ''}`}
              <ChevronDown size={12} />
            </button>
            {assignDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="p-1">
                  {agents.map((u) => (
                    <button key={u.id}
                      onClick={() => handleAssign(u.id)}
                      className="w-full text-left px-3 py-2 text-sm font-dm text-navy hover:bg-slate-50 rounded-lg flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-electric-blue/10 text-electric-blue flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate">{u.name}</span>
                    </button>
                  ))}
                  {agents.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400 font-dm">No active agents found</p>
                  )}
                </div>
                <div className="border-t border-slate-100 p-1">
                  <button onClick={() => handleAssign(null)}
                    className="w-full text-left px-3 py-2 text-sm font-dm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                    <UserX size={14} /> Unassign
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-electric-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Users size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-dm text-sm">No leads found. Import leads via the dialer and assign them here.</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 pr-3 text-left w-8">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-navy">
                    {selected.size === leads.length && leads.length > 0
                      ? <CheckSquare size={16} className="text-electric-blue" />
                      : <Square size={16} />}
                  </button>
                </th>
                <th className="pb-3 pr-4 text-left text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Lead</th>
                <th className="pb-3 pr-4 text-left text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Phone</th>
                <th className="pb-3 pr-4 text-left text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Status</th>
                <th className="pb-3 pr-4 text-left text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Calls</th>
                <th className="pb-3 pr-4 text-left text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Assigned To</th>
                <th className="pb-3 text-left text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id}
                  className={cn('hover:bg-slate-50 transition-colors', selected.has(lead.id) && 'bg-blue-50')}>
                  <td className="py-3 pr-3">
                    <button onClick={() => toggleSelect(lead.id)} className="text-slate-400 hover:text-navy">
                      {selected.has(lead.id)
                        ? <CheckSquare size={15} className="text-electric-blue" />
                        : <Square size={15} />}
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-navy font-dm">{lead.fullName}</p>
                    {lead.companyName && <p className="text-xs text-slate-gray font-dm">{lead.companyName}</p>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-mono text-xs text-slate-600">{lead.phone}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium font-dm', STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-700')}>
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-slate-600 font-dm">
                      {lead.callCount > 0
                        ? `${lead.callCount} call${lead.callCount !== 1 ? 's' : ''}`
                        : <span className="text-slate-400">—</span>}
                    </span>
                    {lead.lastCalledAt && (
                      <p className="text-[10px] text-slate-400 font-dm">
                        {formatDistanceToNow(new Date(lead.lastCalledAt), { addSuffix: true })}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {lead.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {lead.assignedTo.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-xs font-dm text-navy truncate max-w-[120px]">{lead.assignedTo.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 font-dm italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-slate-400 font-dm">
                      {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {leads.length > 0 && (
          <p className="text-xs text-slate-400 font-dm mt-4 text-center">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} · {selected.size} selected
          </p>
        )}
      </div>
    </div>
  );
}
