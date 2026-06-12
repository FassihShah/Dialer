import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Users, PhoneCall, Phone, TrendingUp } from 'lucide-react';

export default async function AdminDashboard() {
  const session = await auth();
  const [userCount, leadCount, callCount, numberCount] = await Promise.all([
    db.user.count({ where: { role: 'user', status: 'active' } }),
    db.lead.count(),
    db.callLog.count(),
    db.phoneNumber.count({ where: { status: 'active' } }),
  ]);

  const recentCalls = await db.callLog.findMany({
    orderBy: { dateTime: 'desc' },
    take: 10,
    include: { user: { select: { name: true } } },
  });

  const stats = [
    { label: 'Active Users', value: userCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Leads', value: leadCount.toLocaleString(), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Total Calls', value: callCount.toLocaleString(), icon: PhoneCall, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Phone Numbers', value: numberCount, icon: Phone, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const outcomeColors: Record<string, string> = {
    cold: 'bg-blue-100 text-blue-800', warm: 'bg-amber-100 text-amber-800',
    meeting_booked: 'bg-emerald-100 text-emerald-800', not_interested: 'bg-red-100 text-red-800',
    callback: 'bg-purple-100 text-purple-800', no_answer: 'bg-slate-100 text-slate-700', do_not_call: 'bg-red-200 text-red-900',
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy font-bricolage">Admin Dashboard</h1>
        <p className="text-sm text-slate-gray font-dm mt-0.5">Welcome back, {session?.user.name}</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon size={20} className={s.color} />
            </div>
            <p className="text-2xl font-bold text-navy font-bricolage">{s.value}</p>
            <p className="text-xs text-slate-gray font-dm mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-navy font-bricolage">Recent Call Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                {['Agent', 'Lead', 'Duration', 'Outcome', 'Time'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-navy font-dm">{c.user.name}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-navy font-dm">{c.leadName || '—'}</p>
                    {c.leadCompany && <p className="text-xs text-slate-gray font-dm">{c.leadCompany}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-navy">{c.durationSeconds > 0 ? `${Math.floor(c.durationSeconds / 60)}m ${c.durationSeconds % 60}s` : '—'}</td>
                  <td className="px-4 py-3">
                    {c.outcome && <span className={`text-xs px-2 py-1 rounded-full font-medium font-dm ${outcomeColors[c.outcome] || 'bg-slate-100 text-slate-700'}`}>{c.outcome.replace(/_/g, ' ')}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-gray font-dm">{new Date(c.dateTime).toLocaleString()}</td>
                </tr>
              ))}
              {recentCalls.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-gray font-dm text-sm">No calls yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
