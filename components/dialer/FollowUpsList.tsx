'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, PhoneCall, Check, X } from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/dialer';
interface FollowUp { id: string; leadId: string; lead: Lead; followUpDate: string; followUpTime: string | null; followUpNotes: string | null; status: string; }

export default function FollowUpsList({ onCallLead }: { onCallLead: (fu: { leadId: string; lead: Lead }) => void }) {
  const qc = useQueryClient();

  const { data: followUps = [], isLoading } = useQuery<FollowUp[]>({
    queryKey: ['follow_ups'],
    queryFn: () => fetch('/api/follow-ups?status=pending').then((r) => r.json()),
    refetchInterval: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch('/api/follow-ups', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['follow_ups'] }),
  });

  if (isLoading) return <div className="p-4"><div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-lg" />)}</div></div>;

  if (followUps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-8">
        <Calendar size={32} className="text-slate-300 mb-3" />
        <p className="text-sm text-slate-gray font-dm">No pending follow-ups</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {followUps.map((fu) => {
        const date = new Date(fu.followUpDate);
        const overdue = isPast(date) && !isToday(date);
        const today = isToday(date);
        return (
          <div key={fu.id} className={cn('bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors',
            overdue ? 'border-red-200 bg-red-50' : today ? 'border-amber-200 bg-amber-50' : 'border-slate-200')}>
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
              overdue ? 'bg-red-100 text-red-600' : today ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>
              <Calendar size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-semibold text-navy text-sm font-dm">{fu.lead.fullName}</p>
                {fu.lead.companyName && <span className="text-xs text-slate-gray font-dm">· {fu.lead.companyName}</span>}
                {overdue && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-dm">Overdue</span>}
                {today && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-dm">Today</span>}
              </div>
              <p className="text-xs text-slate-gray font-dm">
                {format(date, 'MMM d, yyyy')}{fu.followUpTime && ` at ${fu.followUpTime}`}
              </p>
              {fu.followUpNotes && <p className="text-xs text-slate-500 font-dm mt-1 line-clamp-2">{fu.followUpNotes}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onCallLead({ leadId: fu.leadId, lead: fu.lead })}
                className="p-1.5 rounded-lg bg-electric-blue text-white hover:bg-blue-700 transition-colors" title="Call lead">
                <PhoneCall size={13} />
              </button>
              <button onClick={() => updateMutation.mutate({ id: fu.id, status: 'completed' })}
                className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors" title="Mark complete">
                <Check size={13} />
              </button>
              <button onClick={() => updateMutation.mutate({ id: fu.id, status: 'cancelled' })}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors" title="Cancel">
                <X size={13} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
