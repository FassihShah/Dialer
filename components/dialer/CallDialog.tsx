'use client';
import { PhoneOff, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import AIPitchPanel from './AIPitchPanel';
import PostCallActions from './PostCallActions';
import { nameInitials, nameColor, formatTimer } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Lead {
  id: string; fullName: string; companyName: string | null; companyWebsite: string | null;
  phone: string; email: string | null; jobTitle: string | null; industry: string | null;
  region: string | null; notes: string | null; callCount: number; lastCalledAt: string | null;
}

interface CallDialogProps {
  open: boolean; lead: Lead | null;
  callStatus: 'idle' | 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed';
  callDuration: number;
  onHangup: () => void;
  onSave: (payload: PostCallPayload) => Promise<void>;
  onSaveNext: (payload: PostCallPayload) => Promise<void>;
  callingFromNumber?: string;
}

export interface PostCallPayload {
  outcome: string; notes: string; callDuration: number;
  followUp: boolean; followUpDate: string; followUpTime: string; followUpNotes: string;
}

export default function CallDialog({ open, lead, callStatus, callDuration, onHangup, onSave, onSaveNext, callingFromNumber }: CallDialogProps) {
  if (!open || !lead) return null;

  const isActive = ['initiating', 'ringing', 'connected'].includes(callStatus);
  const isEnded = ['ended', 'failed'].includes(callStatus);

  const headerBg = callStatus === 'connected' ? 'bg-emerald-50' : callStatus === 'ended' ? 'bg-slate-100' : callStatus === 'failed' ? 'bg-red-50' : 'bg-blue-50';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className={cn('px-6 py-4 flex items-center justify-between flex-shrink-0 transition-colors', headerBg)}>
          <div>
            <div className="flex items-center gap-3">
              {callStatus === 'initiating' && <><span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /><span className="text-blue-700 font-bold text-sm font-dm uppercase tracking-wider">INITIATING...</span></>}
              {callStatus === 'ringing' && <><span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" /><span className="text-blue-700 font-bold text-sm font-dm uppercase tracking-wider">RINGING...</span><span className="text-navy font-mono font-bold text-lg">{formatTimer(callDuration)}</span></>}
              {callStatus === 'connected' && <><span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" /><span className="text-green-700 font-bold text-sm font-dm uppercase tracking-wider">CONNECTED</span><span className="text-navy font-mono font-bold text-lg">{formatTimer(callDuration)}</span></>}
              {callStatus === 'ended' && <><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /><span className="text-slate-600 font-bold text-sm font-dm uppercase tracking-wider">CALL ENDED — {formatTimer(callDuration)}</span></>}
              {callStatus === 'failed' && <><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-red-600 font-bold text-sm font-dm uppercase tracking-wider">CALL FAILED</span></>}
            </div>
            {callingFromNumber && <p className="text-[11px] text-slate-500 font-dm mt-0.5">Calling from: {callingFromNumber}</p>}
          </div>
          {isActive && (
            <button onClick={onHangup} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium font-dm flex items-center gap-2 transition-colors">
              <PhoneOff size={14} /> End Call
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Lead info */}
          <div className="w-80 flex-shrink-0 border-r border-slate-200 p-5 overflow-y-auto">
            <div className="flex items-center gap-3 mb-5">
              <div className={cn('w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0', nameColor(lead.fullName))}>
                {nameInitials(lead.fullName)}
              </div>
              <div>
                <p className="font-bold text-navy font-bricolage text-lg leading-tight">{lead.fullName}</p>
                {(lead.jobTitle || lead.companyName) && (
                  <p className="text-xs text-slate-gray font-dm">{[lead.jobTitle, lead.companyName].filter(Boolean).join(' at ')}</p>
                )}
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {lead.companyWebsite && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">🌐</span>
                  <a href={lead.companyWebsite.startsWith('http') ? lead.companyWebsite : `https://${lead.companyWebsite}`} target="_blank" rel="noopener noreferrer"
                    className="text-electric-blue font-dm hover:underline flex items-center gap-1 truncate text-xs">
                    {lead.companyWebsite} <ExternalLink size={10} />
                  </a>
                </div>
              )}
              {lead.email && <div className="flex items-center gap-2"><span className="text-slate-400">📧</span><a href={`mailto:${lead.email}`} className="text-electric-blue font-dm hover:underline truncate text-xs">{lead.email}</a></div>}
              {lead.phone && <div className="flex items-center gap-2"><span className="text-slate-400">📞</span><span className="font-mono text-navy text-xs">{lead.phone}</span></div>}
              {lead.industry && <div className="flex items-center gap-2"><span className="text-slate-400">🏭</span><span className="text-navy font-dm text-xs">{lead.industry}</span></div>}
              {lead.region && <div className="flex items-center gap-2"><span className="text-slate-400">🌍</span><span className="text-navy font-dm text-xs">{lead.region}</span></div>}
              <div className="flex items-center gap-2">
                <span className="text-slate-400">📅</span>
                <span className="text-slate-gray font-dm text-xs">
                  {lead.lastCalledAt ? `Last called ${formatDistanceToNow(new Date(lead.lastCalledAt), { addSuffix: true })}` : 'Never called'}
                  {lead.callCount > 0 && ` · ${lead.callCount} call${lead.callCount !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm mb-2">Previous Notes</p>
              <div className="max-h-36 overflow-y-auto bg-slate-50 rounded-lg p-2.5 text-xs font-dm text-navy leading-relaxed">
                {lead.notes || <span className="text-slate-400 italic">No previous notes</span>}
              </div>
            </div>
          </div>

          {/* AI Pitch + Post-call */}
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
            <div className="h-64 flex-shrink-0"><AIPitchPanel lead={lead} /></div>
            <PostCallActions lead={lead} callDuration={callDuration} enabled={isEnded} onSave={onSave} onSaveNext={onSaveNext} />
          </div>
        </div>
      </div>
    </div>
  );
}
