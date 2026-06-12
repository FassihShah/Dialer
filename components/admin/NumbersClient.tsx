'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Phone, X, User, Hash, Globe, CheckCircle, Circle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface PhoneNumber {
  id: string; phoneNumber: string; label: string | null; country: string | null;
  countryCode: string | null; status: string; signalwireSid: string | null;
  assignment: { userId: string; user: { id: string; name: string; email: string } } | null;
}

interface User {
  id: string; name: string; email: string; role: string; status: string;
  phoneAssignment: { phoneNumber: { phoneNumber: string } } | null;
}

export default function NumbersClient() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [detailNumber, setDetailNumber] = useState<PhoneNumber | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: numbers = [], isLoading } = useQuery<PhoneNumber[]>({
    queryKey: ['admin_numbers'],
    queryFn: () => fetch('/api/admin/numbers').then((r) => r.json()),
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['admin_users'],
    queryFn: () => fetch('/api/admin/users').then((r) => r.json()),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/signalwire/numbers');
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'SignalWire sync failed — check Settings first');
      const resp = await fetch('/api/admin/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(d.numbers.map((n: { phone_number: string; friendly_name: string; sid: string; country?: string; country_code?: string }) => ({
          phoneNumber: n.phone_number, label: n.friendly_name, signalwireSid: n.sid,
          country: n.country || null, countryCode: n.country_code || null,
        }))),
      });
      return resp.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin_numbers'] });
      toast({ title: 'Numbers synced', description: `${data?.count ?? ''} numbers updated from SignalWire` });
    },
    onError: (e: Error) => toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }),
  });

  const assignMutation = useMutation({
    mutationFn: (data: { userId: string; phoneNumberId: string | null }) =>
      fetch('/api/admin/assign-number', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_numbers'] });
      qc.invalidateQueries({ queryKey: ['admin_users'] });
      setDetailNumber(null);
      toast({ title: 'Assignment saved' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const openDetail = (n: PhoneNumber) => {
    setDetailNumber(n);
    setSelectedUserId(n.assignment?.userId || '');
  };

  const handleSaveAssignment = () => {
    if (!detailNumber) return;
    if (selectedUserId === '') {
      // Unassign — need existing assignment userId to remove
      if (detailNumber.assignment) {
        assignMutation.mutate({ userId: detailNumber.assignment.userId, phoneNumberId: null });
      } else {
        setDetailNumber(null);
      }
    } else {
      assignMutation.mutate({ userId: selectedUserId, phoneNumberId: detailNumber.id });
    }
  };

  const activeUsers = users.filter((u) => u.status === 'active');
  const assigned = numbers.filter((n) => n.assignment);
  const unassigned = numbers.filter((n) => !n.assignment);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy font-bricolage">Phone Numbers</h1>
          <p className="text-xs text-slate-gray font-dm">
            {numbers.length} number{numbers.length !== 1 ? 's' : ''}
            {unassigned.length > 0 && <span className="ml-2 text-amber-600">{unassigned.length} unassigned</span>}
          </p>
        </div>
        <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium disabled:opacity-60 transition-all">
          <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync from SignalWire'}
        </button>
      </div>

      {numbers.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-48 text-center bg-white rounded-xl border border-slate-200">
          <Phone size={32} className="text-slate-300 mb-3" />
          <p className="text-slate-500 font-dm text-sm font-medium">No numbers yet</p>
          <p className="text-slate-400 font-dm text-xs mt-1">Click &quot;Sync from SignalWire&quot; to import your numbers</p>
        </div>
      )}

      {numbers.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Number', 'Label', 'Country', 'Assigned To', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={5} className="px-4 py-3"><div className="h-5 skeleton rounded" /></td>
                  </tr>
                ))
              ) : numbers.map((n) => (
                <tr key={n.id} onClick={() => openDetail(n)}
                  className="border-b border-slate-50 hover:bg-blue-50/40 cursor-pointer transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-slate-400 group-hover:text-electric-blue transition-colors" />
                      <span className="font-mono text-sm text-navy font-semibold">{n.phoneNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-dm">{n.label || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 font-dm">{n.country || <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3">
                    {n.assignment ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-electric-blue flex items-center justify-center flex-shrink-0">
                          <User size={10} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy font-dm">{n.assignment.user.name}</p>
                          <p className="text-xs text-slate-gray font-dm">{n.assignment.user.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-dm">
                        <Circle size={8} className="fill-amber-400" /> Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm',
                      n.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      {n.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Number detail + assign dialog */}
      {detailNumber && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setDetailNumber(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Phone size={18} className="text-electric-blue" />
                </div>
                <div>
                  <p className="font-bold text-navy font-bricolage text-lg">{detailNumber.phoneNumber}</p>
                  {detailNumber.label && <p className="text-xs text-slate-500 font-dm">{detailNumber.label}</p>}
                </div>
              </div>
              <button onClick={() => setDetailNumber(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            {/* Details */}
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Globe size={11} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">Country</p>
                  </div>
                  <p className="text-sm font-medium text-navy font-dm">{detailNumber.country || '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle size={11} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">Status</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium font-dm',
                    detailNumber.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {detailNumber.status}
                  </span>
                </div>
                {detailNumber.signalwireSid && (
                  <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Hash size={11} className="text-slate-400" />
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">SignalWire SID</p>
                    </div>
                    <p className="text-xs font-mono text-slate-600 break-all">{detailNumber.signalwireSid}</p>
                  </div>
                )}
              </div>

              {/* Assignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm mb-2">Assign To User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-dm bg-white focus:outline-none focus:ring-2 focus:ring-electric-blue/30 focus:border-electric-blue transition-all">
                  <option value="">— Unassigned</option>
                  {activeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}){u.phoneAssignment && u.id !== detailNumber.assignment?.userId ? ' — has a number' : ''}
                    </option>
                  ))}
                </select>
                {selectedUserId && users.find((u) => u.id === selectedUserId)?.phoneAssignment &&
                  users.find((u) => u.id === selectedUserId)?.id !== detailNumber.assignment?.userId && (
                  <p className="text-xs text-amber-600 font-dm mt-1.5">
                    ⚠ This user already has a number assigned. Saving will reassign it to this number.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button onClick={handleSaveAssignment} disabled={assignMutation.isPending}
                className="flex-1 py-2.5 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-xl font-dm font-medium transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {assignMutation.isPending ? (
                  <><RefreshCw size={13} className="animate-spin" /> Saving...</>
                ) : 'Save Assignment'}
              </button>
              <button onClick={() => setDetailNumber(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-xl font-dm transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
