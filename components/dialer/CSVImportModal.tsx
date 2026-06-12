'use client';
import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import Papa from 'papaparse';

const FIELDS = [
  { key: 'full_name', label: 'Full Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'company_name', label: 'Company Name' },
  { key: 'company_website', label: 'Company Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'region', label: 'Region' },
  { key: 'notes', label: 'Notes' },
];

const SAMPLE_CSV = `full_name,phone,email,job_title,company_name,company_website,industry,region,notes
John Smith,+12125551234,john@acme.com,CEO,Acme Corp,https://acme.com,Technology,USA,Interested in AI solutions
Sara Ali,+923001234567,sara@techco.pk,CTO,TechCo,,Technology,Pakistan,`;

interface ImportResult { totalRows: number; importedRows: number; duplicateRows: number; invalidRows: number; errors: Array<{ row: number; reason: string }>; }

export default function CSVImportModal({ open, onClose, onRefresh }: { open: boolean; onClose: () => void; onRefresh: () => void; }) {
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [defaultCode, setDefaultCode] = useState('+1');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields || [];
        const rows = res.data as Record<string, string>[];
        const autoMap: Record<string, string> = {};
        headers.forEach((h) => {
          const norm = h.toLowerCase().replace(/\s+/g, '_');
          const match = FIELDS.find((f) => f.key === norm || f.key === h.toLowerCase() || f.label.toLowerCase() === h.toLowerCase());
          if (match) autoMap[h] = match.key;
        });
        setCsvData({ headers, rows });
        setMapping(autoMap);
        setStep(2);
      },
    });
  };

  const handleImport = async () => {
    if (!csvData) return;
    setImporting(true); setStep(3); setProgress(0);

    const rows = csvData.rows.map((row) => {
      const mapped: Record<string, string> = {};
      Object.entries(mapping).forEach(([csvCol, field]) => {
        if (field && row[csvCol]) mapped[field] = row[csvCol];
      });
      // Normalize phone
      if (mapped.phone && !mapped.phone.startsWith('+')) mapped.phone = defaultCode + mapped.phone;
      // Map snake_case keys to camelCase for API
      return {
        fullName: mapped.full_name || '',
        phone: mapped.phone || '',
        email: mapped.email || null,
        jobTitle: mapped.job_title || null,
        companyName: mapped.company_name || null,
        companyWebsite: mapped.company_website || null,
        industry: mapped.industry || null,
        region: mapped.region || null,
        notes: mapped.notes || null,
      };
    });

    setProgress(30);

    const r = await fetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows, fileName }),
    });

    setProgress(100);
    const data = await r.json();
    setResult(data);
    setImporting(false);
    onRefresh();
  };

  const downloadSample = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }));
    a.download = 'dialer_leads_sample.csv'; a.click();
  };

  const reset = () => { setStep(1); setCsvData(null); setMapping({}); setProgress(0); setResult(null); setFileName(''); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-navy font-bricolage">Import Leads from CSV</h2>
          <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-electric-blue hover:bg-blue-50/30 transition-colors">
                <Upload size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="font-dm text-sm text-slate-gray">Drag & drop a CSV file here, or <span className="text-electric-blue font-medium">click to browse</span></p>
                <p className="text-xs text-slate-400 font-dm mt-1">CSV only, max 10MB</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>
              <button onClick={downloadSample} className="flex items-center gap-2 text-sm text-electric-blue font-dm hover:text-blue-700">
                <Download size={14} /> Download Sample CSV
              </button>
            </div>
          )}

          {step === 2 && csvData && (
            <div className="space-y-4">
              <p className="text-sm text-slate-gray font-dm"><strong>{csvData.rows.length}</strong> rows found in <strong>{fileName}</strong>. Map columns to lead fields.</p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead><tr className="bg-slate-50">{csvData.headers.map((h) => <th key={h} className="px-3 py-2 text-slate-gray font-semibold text-left border-b border-slate-200">{h}</th>)}</tr></thead>
                  <tbody>{csvData.rows.slice(0, 2).map((row, i) => (
                    <tr key={i} className="border-b border-slate-100">{csvData.headers.map((h) => <td key={h} className="px-3 py-1.5 text-navy font-dm">{row[h]}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {csvData.headers.map((h) => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="w-32 text-xs font-medium text-navy font-dm truncate">{h}</span>
                    <span className="text-slate-300 text-sm">→</span>
                    <select value={mapping[h] || ''} onChange={(e) => setMapping((p) => ({ ...p, [h]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-dm bg-white focus:outline-none focus:border-electric-blue">
                      <option value="">— Skip —</option>
                      {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="text-xs font-dm text-blue-800">Default country code for numbers without +:</span>
                <input value={defaultCode} onChange={(e) => setDefaultCode(e.target.value)} placeholder="+1"
                  className="w-20 px-2 py-1 border border-blue-200 rounded text-xs font-mono bg-white focus:outline-none" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              {importing ? (
                <>
                  <p className="font-semibold text-navy font-dm mb-4">Importing leads...</p>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                    <div className="bg-electric-blue h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-sm text-slate-gray font-dm">{progress}% complete</p>
                </>
              ) : result ? (
                <>
                  <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
                  <p className="text-xl font-bold text-navy font-bricolage mb-1">{result.importedRows} leads imported</p>
                  <p className="text-sm text-slate-gray font-dm mb-3">from {result.totalRows} total rows</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Imported', value: result.importedRows, color: 'text-emerald-600' },
                      { label: 'Duplicates', value: result.duplicateRows, color: 'text-amber-600' },
                      { label: 'Invalid', value: result.invalidRows, color: 'text-red-600' },
                    ].map((s) => (
                      <div key={s.label} className="bg-slate-50 rounded-lg p-3">
                        <p className={`text-xl font-bold font-bricolage ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-gray font-dm">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 font-dm mb-1 flex items-center gap-1"><AlertCircle size={12} /> {result.errors.length} rows skipped</p>
                      {result.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-amber-700 font-dm">Row {e.row}: {e.reason}</p>)}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          {step === 1 && <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-gray font-dm hover:bg-slate-50">Close</button>}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-gray font-dm hover:bg-slate-50">Back</button>
              <button onClick={handleImport}
                disabled={!Object.values(mapping).includes('full_name') || !Object.values(mapping).includes('phone')}
                className="flex-1 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium disabled:opacity-60 transition-all">
                Import {csvData?.rows.length} Leads
              </button>
            </>
          )}
          {step === 3 && result && (
            <button onClick={() => { reset(); onClose(); }} className="flex-1 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
