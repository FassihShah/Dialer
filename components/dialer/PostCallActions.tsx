'use client';
import { useState, useEffect } from 'react';
import { AlertTriangle, PhoneForwarded } from 'lucide-react';
import type { PostCallPayload } from './CallDialog';

const OUTCOMES = [
  { key: 'cold',           label: 'Cold',           color: 'bg-blue-100 text-blue-800 border-blue-300',         active: 'bg-blue-600 text-white border-blue-600' },
  { key: 'warm',           label: 'Warm',           color: 'bg-amber-100 text-amber-800 border-amber-300',       active: 'bg-amber-500 text-white border-amber-500' },
  { key: 'meeting_booked', label: 'Meeting Booked', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', active: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-800 border-red-300',             active: 'bg-red-600 text-white border-red-600' },
  { key: 'callback',       label: 'Callback',       color: 'bg-purple-100 text-purple-800 border-purple-300',    active: 'bg-purple-600 text-white border-purple-600' },
  { key: 'no_answer',      label: 'No Answer',      color: 'bg-slate-100 text-slate-700 border-slate-300',       active: 'bg-slate-600 text-white border-slate-600' },
  { key: 'do_not_call',    label: 'Do Not Call',    color: 'bg-red-50 text-red-900 border-red-400',              active: 'bg-red-900 text-white border-red-900' },
];

interface Lead { id: string; fullName: string; notes: string | null; }

export default function PostCallActions({ lead, callDuration, enabled, hasMoreNumbers, onSave, onSaveNext, onTryNextNumber }: {
  lead: Lead; callDuration: number; enabled: boolean;
  hasMoreNumbers?: boolean;
  onSave: (p: PostCallPayload) => Promise<void>;
  onSaveNext: (p: PostCallPayload) => Promise<void>;
  onTryNextNumber?: () => void;
}) {
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [dncConfirm, setDncConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const draftKey = `dialer_draft_${lead?.id}`;

  useEffect(() => {
    if (!lead) return;
    const draft = localStorage.getItem(draftKey);
    if (draft) { try { const d = JSON.parse(draft); setNotes(d.notes || ''); } catch {} }
  }, [lead?.id]);

  useEffect(() => {
    if (!notes || !lead) return;
    const t = setTimeout(() => localStorage.setItem(draftKey, JSON.stringify({ notes, ts: new Date().toISOString() })), 10_000);
    return () => clearTimeout(t);
  }, [notes]);

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!outcome) e.outcome = true;
    if (followUp && !followUpDate) e.followUpDate = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (): PostCallPayload => {
    // Send only the raw notes the rep typed — the server timestamps and
    // appends them to the lead's note history (avoids double-appending).
    return { outcome, notes, callDuration, followUp, followUpDate, followUpTime, followUpNotes };
  };

  const handleSave = async (next: boolean) => {
    if (!validate()) return;
    if (outcome === 'do_not_call' && !dncConfirm) { setDncConfirm(true); return; }
    setSaving(true);
    localStorage.removeItem(draftKey);
    if (next) await onSaveNext(buildPayload());
    else await onSave(buildPayload());
    setSaving(false);
  };

  if (!enabled) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 opacity-40 pointer-events-none">
        <p className="text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm mb-3">Post-Call Actions</p>
        <p className="text-xs text-slate-gray font-dm">Available after call ends</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4 space-y-4 animate-in fade-in duration-300">
      <p className="text-xs font-semibold text-slate-gray uppercase tracking-wider font-dm">Post-Call Actions</p>

      <div>
        <p className="text-xs font-medium text-navy font-dm mb-2">Call Outcome <span className="text-red-500">*</span></p>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button key={o.key} onClick={() => { setOutcome(o.key); setErrors((e) => ({ ...e, outcome: false })); }}
              className={`px-3 py-1.5 text-xs rounded-full border font-medium font-dm transition-all ${outcome === o.key ? o.active : o.color}`}>
              {o.label}
            </button>
          ))}
        </div>
        {errors.outcome && <p className="text-xs text-red-500 font-dm mt-1">Please select a call outcome</p>}
        {outcome === 'do_not_call' && !dncConfirm && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs text-red-700 font-dm flex items-center gap-1">
              <AlertTriangle size={12} /> This will mark this lead as Do Not Call and add to DNC list.
              <button onClick={() => setDncConfirm(true)} className="ml-1 underline font-medium">Confirm</button>
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-navy font-dm">Notes</p>
          <span className="text-xs text-slate-400 font-dm">{notes.length} chars</span>
        </div>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Add call notes... What was discussed? What are the next steps?"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue resize-none" />
      </div>

      <div>
        <div className="flex items-center gap-3">
          <button onClick={() => setFollowUp((f) => !f)}
            className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors ${followUp ? 'bg-electric-blue' : 'bg-slate-200'}`}>
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${followUp ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs font-medium text-navy font-dm">Schedule Follow-up</span>
        </div>
        {followUp && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-blue-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-gray font-dm mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className={`w-full px-2 py-1.5 border rounded-lg text-xs font-dm focus:outline-none focus:border-electric-blue ${errors.followUpDate ? 'border-red-400' : 'border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-xs text-slate-gray font-dm mb-1">Time</label>
                <input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-dm focus:outline-none focus:border-electric-blue" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-gray font-dm mb-1">Follow-up Notes</label>
              <textarea rows={2} value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-dm focus:outline-none focus:border-electric-blue resize-none" />
            </div>
          </div>
        )}
      </div>

      {/* Try next number — shown when lead has more phones and no outcome is selected yet */}
      {hasMoreNumbers && onTryNextNumber && !outcome && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-800 font-dm">More numbers available</p>
            <p className="text-xs text-blue-600 font-dm">Log no answer and dial the next number automatically.</p>
          </div>
          <button onClick={onTryNextNumber} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-dm font-medium transition-colors whitespace-nowrap ml-3 flex-shrink-0">
            <PhoneForwarded size={13} /> Try Next Number
          </button>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={() => handleSave(true)} disabled={saving}
          className="flex-1 py-2.5 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-medium font-dm disabled:opacity-60 transition-colors">
          {saving ? 'Saving...' : 'Save & Next Lead'}
        </button>
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-navy text-sm rounded-lg font-medium font-dm disabled:opacity-60 transition-colors">
          Save & Close
        </button>
      </div>
    </div>
  );
}
