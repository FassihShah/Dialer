'use client';
import { Play, Pause, Square, RotateCcw, PhoneCall, SkipForward, Phone } from 'lucide-react';
import { cn, nameInitials, nameColor } from '@/lib/utils';
import type { Lead } from '@/types/dialer';
import { getPhoneList } from '@/types/dialer';

export default function AutoDialer({ leads, onCall, onSkip, isRunning, isPaused, onStart, onStop, onPause, onResume, sessionComplete, onResetSession, hasAssignedNumber }: {
  leads: Lead[]; onCall: (l: Lead) => void; onSkip: (l: Lead | null) => void;
  isRunning: boolean; isPaused: boolean;
  onStart: () => void; onStop: () => void; onPause: () => void; onResume: () => void;
  sessionComplete: boolean; onResetSession: () => void; hasAssignedNumber: boolean;
}) {
  const remaining = leads.filter((l) => !l.calledInSession && l.status !== 'do_not_call');
  const called = leads.filter((l) => l.calledInSession);
  const current = remaining[0];

  return (
    <div className="flex flex-col h-full p-6">
      {/* Session stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Leads', value: leads.length },
          { label: 'Called', value: called.length, color: 'text-emerald-600' },
          { label: 'Remaining', value: remaining.length, color: 'text-electric-blue' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className={cn('text-2xl font-bold font-bricolage', s.color || 'text-navy')}>{s.value}</p>
            <p className="text-xs text-slate-gray font-dm mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {sessionComplete ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneCall size={28} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-navy font-bricolage mb-2">Session Complete!</h3>
          <p className="text-sm text-slate-gray font-dm mb-6">All {called.length} leads have been called.</p>
          <button onClick={onResetSession} className="flex items-center gap-2 px-6 py-3 bg-electric-blue hover:bg-blue-700 text-white rounded-xl font-dm font-medium transition-all">
            <RotateCcw size={15} /> Start New Session
          </button>
        </div>
      ) : (
        <>
          {/* Current lead */}
          {current && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm mb-3">Next Up</p>
              <div className="flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm', nameColor(current.fullName))}>
                  {nameInitials(current.fullName)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-navy font-bricolage">{current.fullName}</p>
                  {current.companyName && <p className="text-sm text-slate-gray font-dm">{current.companyName}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-mono text-slate-500">{current.phone}</p>
                    {getPhoneList(current).length > 1 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-dm font-medium">
                        <Phone size={9} /> {getPhoneList(current).length} numbers
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => onSkip(current)} className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-700 text-sm font-dm border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                  <SkipForward size={13} /> Skip
                </button>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 mb-6">
            {!isRunning ? (
              <button onClick={onStart} disabled={remaining.length === 0 || !hasAssignedNumber}
                className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-dm font-medium disabled:opacity-50 transition-all shadow-md shadow-green-500/20">
                <Play size={15} /> Start Auto-Dial
              </button>
            ) : isPaused ? (
              <>
                <button onClick={onResume} className="flex items-center gap-2 px-6 py-3 bg-electric-blue hover:bg-blue-700 text-white rounded-xl font-dm font-medium transition-all">
                  <Play size={15} /> Resume
                </button>
                <button onClick={onStop} className="flex items-center gap-2 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-dm font-medium transition-all">
                  <Square size={15} /> Stop
                </button>
              </>
            ) : (
              <>
                <button onClick={onPause} className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-dm font-medium transition-all">
                  <Pause size={15} /> Pause
                </button>
                <button onClick={onStop} className="flex items-center gap-2 px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-dm font-medium transition-all">
                  <Square size={15} /> Stop
                </button>
              </>
            )}
            {!hasAssignedNumber && <p className="text-xs text-amber-600 font-dm">Dialer initializing...</p>}
          </div>

          {/* Queue */}
          <div className="flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm mb-2">Queue ({remaining.length})</p>
            <div className="space-y-1">
              {remaining.slice(0, 20).map((l, idx) => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-slate-100 hover:border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">{idx + 1}</span>
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold', nameColor(l.fullName))}>
                    {nameInitials(l.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy font-dm truncate">{l.fullName}</p>
                    {l.companyName && <p className="text-xs text-slate-gray font-dm truncate">{l.companyName}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-mono text-slate-400">{l.phone}</span>
                    {getPhoneList(l).length > 1 && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-600 font-dm">+{getPhoneList(l).length - 1}</span>
                    )}
                  </div>
                </div>
              ))}
              {remaining.length > 20 && <p className="text-xs text-slate-400 font-dm px-3">...and {remaining.length - 20} more</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
