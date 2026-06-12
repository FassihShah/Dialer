'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX, Check, X, Phone, UserCheck, Clock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn, nameColor, nameInitials } from '@/lib/utils';

interface User {
  id: string; name: string; email: string; role: string; status: string;
  agentPhone: string | null;
  phoneAssignment: { phoneNumber: { phoneNumber: string; label: string | null } } | null;
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  pending:   'bg-amber-100 text-amber-700',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  active:    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1" />,
  suspended: <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1" />,
  pending:   <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block mr-1" />,
};

export default function UsersClient() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin_users'],
    queryFn: () => fetch('/api/admin/users').then((r) => r.json()),
    refetchInterval: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: object }) => {
      const r = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed'); }
      return r.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin_users'] });
      setEditing(null);
      const action = (vars.data as Record<string, string>).status;
      toast({ title: action === 'active' ? 'User approved' : action === 'suspended' ? 'User suspended' : 'User updated' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed'); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin_users'] }); setShowCreate(false); toast({ title: 'User created' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/admin/users/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin_users'] }); toast({ title: 'User suspended' }); },
  });

  const pending = users.filter((u) => u.status === 'pending');
  const rest = users.filter((u) => u.status !== 'pending');

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-navy font-bricolage">Users</h1>
          <p className="text-xs text-slate-gray font-dm">
            {users.length} total
            {pending.length > 0 && <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-semibold">{pending.length} pending approval</span>}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium transition-all">
          <Plus size={14} /> Create User
        </button>
      </div>

      {showCreate && <UserForm onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} loading={createMutation.isPending} />}
      {editing && <UserForm user={editing} onSave={(d) => updateMutation.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} loading={updateMutation.isPending} />}

      {/* Pending approvals banner */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800 font-dm">Pending Approvals ({pending.length})</p>
          </div>
          <div className="space-y-2">
            {pending.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', nameColor(u.name))}>
                    {nameInitials(u.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-navy font-dm">{u.name}</p>
                    <p className="text-xs text-slate-gray font-dm">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateMutation.mutate({ id: u.id, data: { status: 'active' } })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-dm font-medium transition-colors">
                    <UserCheck size={12} /> Approve
                  </button>
                  <button onClick={() => suspendMutation.mutate(u.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg font-dm font-medium transition-colors">
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['User', 'Role', 'Status', 'Assigned Number', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider font-dm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-gray font-dm">Loading...</td></tr>
            ) : rest.length === 0 && !isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-dm text-sm">No active or suspended users</td></tr>
            ) : rest.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0', nameColor(u.name))}>
                      {nameInitials(u.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy font-dm">{u.name}</p>
                      <p className="text-xs text-slate-gray font-dm">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm', u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-xs px-2 py-1 rounded-full font-medium font-dm inline-flex items-center', STATUS_BADGE[u.status] || 'bg-slate-100 text-slate-700')}>
                    {STATUS_ICON[u.status]}{u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.phoneAssignment ? (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="text-emerald-600" />
                      <span className="text-xs font-mono text-navy">{u.phoneAssignment.phoneNumber.phoneNumber}</span>
                      {u.phoneAssignment.phoneNumber.label && <span className="text-xs text-slate-400">({u.phoneAssignment.phoneNumber.label})</span>}
                    </div>
                  ) : <span className="text-xs text-slate-400 font-dm">— Not assigned</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(u)} title="Edit"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-navy transition-colors">
                      <Pencil size={13} />
                    </button>
                    {u.status === 'active' && (
                      <button onClick={() => suspendMutation.mutate(u.id)} title="Suspend"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                        <UserX size={13} />
                      </button>
                    )}
                    {u.status === 'suspended' && (
                      <button onClick={() => updateMutation.mutate({ id: u.id, data: { status: 'active' } })} title="Reactivate"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                        <Check size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserForm({ user, onSave, onCancel, loading }: {
  user?: Partial<{ name: string; email: string; role: string; status: string; agentPhone: string | null }>;
  onSave: (data: object) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', password: '',
    role: user?.role || 'user', status: user?.status || 'active',
    agentPhone: user?.agentPhone || '',
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    const data: Record<string, string> = { ...form };
    if (!data.password) delete data.password;
    if (!data.agentPhone) delete data.agentPhone;
    onSave(data);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
      <h3 className="text-sm font-bold text-navy font-bricolage mb-4">{user ? 'Edit User' : 'Create User'}</h3>
      <div className="grid grid-cols-3 gap-3">
        {[
          { k: 'name', label: 'Full Name', placeholder: 'Jane Doe' },
          { k: 'email', label: 'Email', placeholder: 'jane@company.com', type: 'email' },
          { k: 'password', label: user ? 'New Password (leave blank to keep)' : 'Password', placeholder: '••••••••', type: 'password' },
          { k: 'agentPhone', label: 'Agent Phone (bridge fallback)', placeholder: '+14155551234' },
        ].map((f) => (
          <div key={f.k}>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">{f.label}</label>
            <input type={f.type || 'text'} value={(form as Record<string, string>)[f.k]} onChange={(e) => set(f.k, e.target.value)} placeholder={f.placeholder}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">Role</label>
          <select value={form.role} onChange={(e) => set('role', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue bg-white">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {user && (
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue bg-white">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={handleSave} disabled={loading || !form.name || !form.email}
          className="flex items-center gap-1.5 px-4 py-2 bg-electric-blue text-white text-sm rounded-lg font-dm disabled:opacity-60">
          <Check size={13} /> {loading ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm rounded-lg font-dm">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
