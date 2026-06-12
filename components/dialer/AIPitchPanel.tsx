'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

interface Lead { id: string; fullName: string; jobTitle: string | null; companyName: string | null; industry: string | null; region: string | null; notes: string | null; }

export default function AIPitchPanel({ lead }: { lead: Lead }) {
  const [pitch, setPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const generate = async () => {
    if (!lead) return;
    setLoading(true); setError(false); setPitch(null);
    try {
      const r = await fetch('/api/ai/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: lead.fullName, jobTitle: lead.jobTitle, companyName: lead.companyName, industry: lead.industry, region: lead.region, notes: lead.notes }),
      });
      const d = await r.json();
      if (d.pitch) setPitch(d.pitch);
      else setError(true);
    } catch { setError(true); }
    setLoading(false);
  };

  useEffect(() => { if (lead?.id) generate(); }, [lead?.id]);

  return (
    <div className="flex flex-col h-full bg-[#EFF6FF] rounded-xl border border-blue-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-blue-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-blue-500" />
          <span className="text-xs font-semibold text-blue-800 font-dm uppercase tracking-wider">AI Pitch Summary</span>
        </div>
        <button onClick={generate} disabled={loading} className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-500 transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[80, 100, 60, 90, 70, 80, 50].map((w, i) => <div key={i} className="h-3 bg-blue-200 rounded" style={{ width: `${w}%` }} />)}
          </div>
        )}
        {error && (
          <div className="text-center py-6">
            <AlertCircle size={24} className="text-blue-300 mx-auto mb-2" />
            <p className="text-xs text-blue-600 font-dm mb-3">Could not generate pitch. Check your ANTHROPIC_API_KEY.</p>
            <button onClick={generate} className="text-xs text-blue-700 font-dm font-medium hover:underline">Try Again</button>
          </div>
        )}
        {pitch && !loading && <div className="text-xs text-blue-900 font-dm leading-relaxed whitespace-pre-wrap">{pitch}</div>}
        {!pitch && !loading && !error && <div className="text-center py-6 text-blue-400 font-dm text-xs">Generating pitch...</div>}
      </div>
    </div>
  );
}
