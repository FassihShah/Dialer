'use client';
import { PhoneCall, X, Delete } from 'lucide-react';
import { cn, nameInitials, nameColor } from '@/lib/utils';

interface Lead { id: string; fullName: string; companyName: string | null; phone: string; }

export default function ManualDialpad({ number, onNumberChange, onCall, selectedLead, onClearLead, assignedPhoneNumber, callInProgress }: {
  number: string; onNumberChange: (n: string) => void; onCall: () => void;
  selectedLead: Lead | null; onClearLead: () => void;
  assignedPhoneNumber: { phoneNumber: string; label?: string | null };
  callInProgress: boolean;
}) {
  const digits = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  const addDigit = (d: string) => onNumberChange(number + d);
  const backspace = () => onNumberChange(number.slice(0, -1));

  return (
    <div className="flex flex-col items-center w-72">
      {selectedLead && (
        <div className="w-full mb-4 flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 border border-blue-200">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0', nameColor(selectedLead.fullName))}>
            {nameInitials(selectedLead.fullName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-sm font-dm truncate">{selectedLead.fullName}</p>
            {selectedLead.companyName && <p className="text-xs text-slate-gray font-dm truncate">{selectedLead.companyName}</p>}
          </div>
          <button onClick={onClearLead} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Display */}
      <div className="w-full relative mb-4">
        <input value={number} onChange={(e) => onNumberChange(e.target.value)}
          placeholder="+1 (___) ___-____"
          className="w-full text-center text-2xl font-mono font-bold text-navy bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 focus:outline-none focus:border-electric-blue pr-10"
        />
        {number && (
          <button onClick={backspace} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
            <Delete size={16} />
          </button>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2 w-full mb-4">
        {digits.map((d) => (
          <button key={d} onClick={() => addDigit(d)}
            className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-navy font-bold text-xl font-mono border border-slate-200 transition-all">
            {d}
          </button>
        ))}
      </div>

      {/* Assigned number info */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-dm mb-4">
        <span>{assignedPhoneNumber.label || '📞'}</span>
        <span>{assignedPhoneNumber.phoneNumber}</span>
      </div>

      {/* Call button */}
      <button onClick={onCall} disabled={!number.trim() || callInProgress}
        className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white flex items-center justify-center shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        <PhoneCall size={26} />
      </button>
    </div>
  );
}
