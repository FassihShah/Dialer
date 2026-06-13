'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, X, Building2, Users, Phone, Database, Power, ShieldCheck, ShieldAlert, UserPlus, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  createdAt: string;
  counts: { users: number; leads: number; numbers: number };
  admins: { id: string; name: string; email: string; status: string }[];
  voipConfigured: boolean;
}

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function SuperClient() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'workspaces' | 'pending'>('workspaces');

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ['super_workspaces'],
    queryFn: () => fetch('/api/super/workspaces').then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const { data: pendingUsers = [] } = useQuery<PendingUser[]>({
    queryKey: ['super_pending_users'],
    queryFn: () => fetch('/api/super/pending-users').then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch('/api/super/workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed'); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['super_workspaces'] }); setShowCreate(false); toast({ title: 'Workspace created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'suspended' }) => {
      const r = await fetch(`/api/super/workspaces/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed'); }
      return r.json();
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['super_workspaces'] }); toast({ title: vars.status === 'active' ? 'Workspace reactivated' : 'Workspace suspended' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center bg-slate-100 rounded-xl p-1">
          <button onClick={() => setTab('workspaces')}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium font-dm transition-all', tab === 'workspaces' ? 'bg-navy text-white shadow-sm' : 'text-slate-500 hover:text-navy')}>
            Workspaces
          </button>
          <button onClick={() => setTab('pending')}
            className={cn('flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium font-dm transition-all', tab === 'pending' ? 'bg-navy text-white shadow-sm' : 'text-slate-500 hover:text-navy')}>
            Pending Users
            {pendingUsers.length > 0 && (
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', tab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700')}>
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>
        {tab === 'workspaces' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium transition-all">
            <Plus size={14} /> Create Workspace
          </button>
        )}
      </div>

      {tab === 'pending' ? (
        <PendingUsersPanel users={pendingUsers} workspaces={workspaces} />
      ) : (
      <>
      {showCreate && <CreateForm onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />}

      {isLoading ? (
        <p className="text-center text-slate-gray font-dm py-12">Loading...</p>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-navy font-dm">No workspaces yet</p>
          <p className="text-xs text-slate-400 font-dm mt-1">Create the first workspace and its admin to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workspaces.map((w) => (
            <div key={w.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy/5 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-navy" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-navy font-dm">{w.name}</p>
                    <p className="text-xs text-slate-400 font-dm">/{w.slug}</p>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm inline-flex items-center gap-1',
                  w.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', w.status === 'active' ? 'bg-emerald-500' : 'bg-red-500')} />
                  {w.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <Stat icon={<Users size={13} />} label="Users" value={w.counts.users} />
                <Stat icon={<Database size={13} />} label="Leads" value={w.counts.leads} />
                <Stat icon={<Phone size={13} />} label="Numbers" value={w.counts.numbers} />
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="text-xs font-dm">
                  {w.admins.length > 0 ? (
                    <span className="text-slate-gray">Admin: <span className="text-navy font-medium">{w.admins[0].email}</span></span>
                  ) : <span className="text-amber-600">No admin</span>}
                  <span className={cn('ml-2 inline-flex items-center gap-1', w.voipConfigured ? 'text-emerald-600' : 'text-slate-400')}>
                    {w.voipConfigured ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                    {w.voipConfigured ? 'VoIP set' : 'VoIP not set'}
                  </span>
                </div>
                {w.status === 'active' ? (
                  <button onClick={() => statusMutation.mutate({ id: w.id, status: 'suspended' })}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-dm text-red-600 hover:bg-red-50 transition-colors">
                    <Power size={12} /> Suspend
                  </button>
                ) : (
                  <button onClick={() => statusMutation.mutate({ id: w.id, status: 'active' })}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-dm text-emerald-600 hover:bg-emerald-50 transition-colors">
                    <Power size={12} /> Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">{icon}<span className="text-[10px] uppercase tracking-wider font-dm">{label}</span></div>
      <p className="text-sm font-bold text-navy font-dm">{value}</p>
    </div>
  );
}

function PendingUsersPanel({ users, workspaces }: { users: PendingUser[]; workspaces: Workspace[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  // Per-row selection state: { [userId]: { workspaceId, role } }
  const [sel, setSel] = useState<Record<string, { workspaceId: string; role: string }>>({});

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['super_pending_users'] });
    qc.invalidateQueries({ queryKey: ['super_workspaces'] });
  };

  const placeMutation = useMutation({
    mutationFn: async ({ id, workspaceId, role }: { id: string; workspaceId: string; role: string }) => {
      const r = await fetch(`/api/super/pending-users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, role }) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed'); }
      return r.json();
    },
    onSuccess: () => { refresh(); toast({ title: 'User placed into workspace' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/super/pending-users/${id}`, { method: 'DELETE' });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed'); }
      return r.json();
    },
    onSuccess: () => { refresh(); toast({ title: 'User rejected' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <UserPlus size={32} className="text-slate-300 mx-auto mb-3" />
        <p className="font-semibold text-navy font-dm">No users awaiting placement</p>
        <p className="text-xs text-slate-400 font-dm mt-1">Self-registered accounts that aren&apos;t in a workspace yet will show up here.</p>
      </div>
    );
  }

  const activeWorkspaces = workspaces.filter((w) => w.status === 'active');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
        <Clock size={15} className="text-amber-600" />
        <p className="text-sm font-semibold text-amber-800 font-dm">{users.length} account{users.length === 1 ? '' : 's'} awaiting placement</p>
      </div>
      {activeWorkspaces.length === 0 && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-700 font-dm">Create an active workspace first — there&apos;s nowhere to place these users yet.</p>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {['User', 'Registered', 'Workspace', 'Role', 'Actions'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const row = sel[u.id] || { workspaceId: '', role: 'user' };
            const setRow = (patch: Partial<{ workspaceId: string; role: string }>) =>
              setSel((p) => ({ ...p, [u.id]: { ...row, ...patch } }));
            return (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-navy font-dm">{u.name}</p>
                  <p className="text-xs text-slate-gray font-dm">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-gray font-dm">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <select value={row.workspaceId} onChange={(e) => setRow({ workspaceId: e.target.value })}
                    className="w-full max-w-[180px] px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue bg-white">
                    <option value="">Select workspace…</option>
                    {activeWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select value={row.role} onChange={(e) => setRow({ role: e.target.value })}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue bg-white">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => placeMutation.mutate({ id: u.id, workspaceId: row.workspaceId, role: row.role })}
                      disabled={!row.workspaceId || placeMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs rounded-lg font-dm font-medium transition-colors">
                      <Check size={12} /> Place
                    </button>
                    <button onClick={() => rejectMutation.mutate(u.id)} disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg font-dm font-medium transition-colors">
                      <X size={12} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CreateForm({ onSave, onCancel, loading }: { onSave: (data: object) => void; onCancel: () => void; loading: boolean }) {
  const [form, setForm] = useState({ name: '', adminName: '', adminEmail: '', adminPassword: '' });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.name.length >= 2 && form.adminName.length >= 2 && /\S+@\S+\.\S+/.test(form.adminEmail) && form.adminPassword.length >= 8;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
      <h3 className="text-sm font-bold text-navy font-bricolage mb-1">Create Workspace</h3>
      <p className="text-xs text-slate-gray font-dm mb-4">Creates the workspace and its first admin. The admin then configures their own SignalWire and adds users.</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { k: 'name', label: 'Workspace Name', placeholder: 'Acme Sales' },
          { k: 'adminName', label: 'Admin Full Name', placeholder: 'Jane Doe' },
          { k: 'adminEmail', label: 'Admin Email', placeholder: 'jane@acme.com', type: 'email' },
          { k: 'adminPassword', label: 'Admin Password', placeholder: '•••••••• (min 8)', type: 'password' },
        ].map((f) => (
          <div key={f.k}>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">{f.label}</label>
            <input type={f.type || 'text'} value={(form as Record<string, string>)[f.k]} onChange={(e) => set(f.k, e.target.value)} placeholder={f.placeholder}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue" />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(form)} disabled={loading || !valid}
          className="flex items-center gap-1.5 px-4 py-2 bg-electric-blue text-white text-sm rounded-lg font-dm disabled:opacity-60">
          <Check size={13} /> {loading ? 'Creating...' : 'Create Workspace'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg font-dm">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
