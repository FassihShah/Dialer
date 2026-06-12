'use client';
import { useState } from 'react';
import { X, Plus } from 'lucide-react';

const INDUSTRIES = ['Technology', 'Healthcare', 'Finance', 'E-commerce', 'Education', 'Real Estate', 'Marketing', 'Legal', 'Other'];
const STATUSES = ['new', 'cold', 'warm', 'callback'] as const;

interface LeadForm {
  fullName: string; phone: string; email: string; jobTitle: string; companyName: string;
  companyWebsite: string; industry: string; region: string; status: string; notes: string;
}

export default function AddLeadModal({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (data: Partial<LeadForm>) => Promise<void>;
}) {
  const [form, setForm] = useState<LeadForm>({ fullName: '', phone: '', email: '', jobTitle: '', companyName: '', companyWebsite: '', industry: '', region: '', status: 'new', notes: '' });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof LeadForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      await onAdd(form);
      setForm({ fullName: '', phone: '', email: '', jobTitle: '', companyName: '', companyWebsite: '', industry: '', region: '', status: 'new', notes: '' });
      onClose();
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-navy font-bricolage">Add Lead to Dialer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'fullName', label: 'Full Name *', placeholder: 'Jane Smith', required: true },
              { k: 'phone', label: 'Phone *', placeholder: '+1 212 555 1234', required: true, mono: true },
              { k: 'email', label: 'Email', placeholder: 'jane@company.com', type: 'email' },
              { k: 'jobTitle', label: 'Job Title', placeholder: 'CEO' },
              { k: 'companyName', label: 'Company', placeholder: 'Acme Corp' },
              { k: 'companyWebsite', label: 'Website', placeholder: 'https://acme.com' },
              { k: 'region', label: 'Region', placeholder: 'USA, UAE...' },
            ].map((f) => (
              <div key={f.k}>
                <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.k as keyof LeadForm]} onChange={(e) => set(f.k as keyof LeadForm, e.target.value)}
                  required={f.required} placeholder={f.placeholder}
                  className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-electric-blue ${f.mono ? 'font-mono' : 'font-dm'}`} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">Industry</label>
              <select value={form.industry} onChange={(e) => set('industry', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue bg-white">
                <option value="">Select...</option>
                {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">Notes</label>
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1 font-dm">Initial Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue bg-white">
              {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </form>
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-gray font-dm hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit as unknown as () => void} disabled={saving || !form.fullName.trim() || !form.phone.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium disabled:opacity-60">
            <Plus size={14} /> {saving ? 'Adding...' : 'Add Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
