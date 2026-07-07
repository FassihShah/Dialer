'use client';
import { useState, useRef, useMemo } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import { COUNTRIES, parsePhoneList, isE164, type Country } from '@/lib/phone';

// ── Field definitions ─────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'full_name',       label: 'Full Name',        required: true },
  { key: 'phone',           label: 'Phone / Phones',   required: true },
  { key: 'email',           label: 'Email' },
  { key: 'job_title',       label: 'Job Title' },
  { key: 'company_name',    label: 'Company Name' },
  { key: 'company_website', label: 'Company Website' },
  { key: 'industry',        label: 'Industry' },
  { key: 'region',          label: 'Region' },
  { key: 'notes',           label: 'Notes' },
];

// Auto-mapping heuristics: CSV header → field key
const ALIASES: Record<string, string> = {
  name: 'full_name', full_name: 'full_name', fullname: 'full_name', contact: 'full_name',
  phone: 'phone', phones: 'phone', mobile: 'phone', cell: 'phone', telephone: 'phone',
  number: 'phone', contact_number: 'phone', phone_number: 'phone',
  email: 'email', email_address: 'email',
  title: 'job_title', job_title: 'job_title', jobtitle: 'job_title', designation: 'job_title', position: 'job_title',
  company: 'company_name', company_name: 'company_name', organization: 'company_name', organisation: 'company_name',
  website: 'company_website', url: 'company_website', company_website: 'company_website',
  industry: 'industry', sector: 'industry',
  region: 'region', location: 'region', city: 'region', country: 'region', area: 'region',
  notes: 'notes', note: 'notes', comments: 'notes', remarks: 'notes',
};

const SAMPLE_CSV = `full_name,phone,email,job_title,company_name,company_website,industry,region,notes
John Smith,"+1 212-555-1234, +1 212-555-5678",john@acme.com,CEO,Acme Corp,https://acme.com,Technology,USA,Interested in AI solutions
Sara Ali,03001234567,sara@techco.pk,CTO,TechCo,,Technology,Pakistan,
Ahmed Khan,"+971 50 123 4567",ahmed@corp.ae,Director,Corp AE,,Finance,UAE,`;

interface ImportResult {
  totalRows: number; importedRows: number; duplicateRows: number; invalidRows: number;
  errors: Array<{ row: number; reason: string }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CSVImportModal({ open, onClose, onRefresh }: {
  open: boolean; onClose: () => void; onRefresh: () => void;
}) {
  const [step, setStep] = useState(1);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [countryCode, setCountryCode] = useState('PK');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCountry = useMemo<Country>(
    () => COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES.find((c) => c.code === 'PK')!,
    [countryCode],
  );

  const filteredCountries = useMemo(
    () => COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.dialCode.includes(countrySearch)),
    [countrySearch],
  );

  // ── File handling ────────────────────────────────────────────────────────────

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
          const norm = h.toLowerCase().replace(/[\s_-]+/g, '_');
          const hit = ALIASES[norm] || ALIASES[h.toLowerCase()];
          if (hit) autoMap[h] = hit;
        });
        setCsvData({ headers, rows });
        setMapping(autoMap);
        setStep(2);
      },
    });
  };

  // ── Phone preview ────────────────────────────────────────────────────────────

  const phoneColumn = Object.entries(mapping).find(([, v]) => v === 'phone')?.[0];

  const phonePreview = useMemo(() => {
    if (!csvData || !phoneColumn) return [];
    return csvData.rows.slice(0, 3).map((row) => {
      const raw = row[phoneColumn] || '';
      const nums = parsePhoneList(raw, selectedCountry.dialCode, selectedCountry.localPrefix);
      return { raw, primary: nums[0] || null, extras: nums.slice(1), valid: nums.length > 0 };
    });
  }, [csvData, phoneColumn, selectedCountry]);

  // ── Import handler ───────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!csvData) return;
    setImporting(true); setStep(3); setProgress(10);

    const rows = csvData.rows.map((row) => {
      // Build a mapped object from CSV columns → field keys
      const mapped: Record<string, string> = {};
      Object.entries(mapping).forEach(([csvCol, field]) => {
        if (field && row[csvCol] != null) mapped[field] = row[csvCol];
      });

      // Parse phone column: comma-separated → primary + altPhones
      const rawPhone = mapped.phone || '';
      const phones = parsePhoneList(rawPhone, selectedCountry.dialCode, selectedCountry.localPrefix);
      const primaryPhone = phones[0] || rawPhone.trim(); // fall back to raw so API rejects properly
      const altPhones = phones.length > 1 ? JSON.stringify(phones.slice(1)) : null;

      return {
        fullName:       mapped.full_name || '',
        phone:          primaryPhone,
        altPhones,
        email:          mapped.email || null,
        jobTitle:       mapped.job_title || null,
        companyName:    mapped.company_name || null,
        companyWebsite: mapped.company_website || null,
        industry:       mapped.industry || null,
        region:         mapped.region || null,
        notes:          mapped.notes || null,
      };
    });

    setProgress(40);

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
    a.download = 'dialer_leads_sample.csv';
    a.click();
  };

  const reset = () => {
    setStep(1); setCsvData(null); setMapping({}); setProgress(0);
    setResult(null); setFileName(''); setCountrySearch(''); setShowCountryDrop(false);
  };

  const canImport = Object.values(mapping).includes('full_name') && Object.values(mapping).includes('phone');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-bold text-navy font-bricolage">Import Leads from CSV</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {[1, 2, 3].map((s) => (
                <span key={s} className={`w-1.5 h-1.5 rounded-full ${step >= s ? 'bg-electric-blue' : 'bg-slate-200'}`} />
              ))}
              <span className="text-xs text-slate-400 font-dm">{step === 1 ? 'Upload' : step === 2 ? 'Map & Configure' : 'Results'}</span>
            </div>
          </div>
          <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* ── Step 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-electric-blue hover:bg-blue-50/30 transition-colors">
                <Upload size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="font-dm text-sm text-slate-gray">Drag & drop a CSV file here, or <span className="text-electric-blue font-medium">click to browse</span></p>
                <p className="text-xs text-slate-400 font-dm mt-1">CSV only · Headers in first row · Phone column may have comma-separated numbers</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 font-dm">Tips for best results</p>
                <ul className="text-xs text-slate-500 font-dm space-y-1 list-disc list-inside">
                  <li>Include a <code className="bg-slate-200 px-1 rounded">phone</code> column — you can name it phone, mobile, telephone, or contact_number</li>
                  <li>Multiple numbers for one lead: put them in the phone column separated by commas, e.g. <code className="bg-slate-200 px-1 rounded">+1-212-555-1234, +1-646-555-9876</code></li>
                  <li>Local format numbers (without country code) are OK — set the country in the next step</li>
                </ul>
              </div>

              <button onClick={downloadSample} className="flex items-center gap-2 text-sm text-electric-blue font-dm hover:text-blue-700">
                <Download size={14} /> Download Sample CSV
              </button>
            </div>
          )}

          {/* ── Step 2: Map ── */}
          {step === 2 && csvData && (
            <div className="space-y-4">
              <p className="text-sm text-slate-gray font-dm">
                <strong className="text-navy">{csvData.rows.length}</strong> rows found in <strong className="text-navy">{fileName}</strong>
              </p>

              {/* Country selector */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-800 font-dm mb-2">📞 Default country for phone normalization</p>
                <p className="text-xs text-blue-600 font-dm mb-3">
                  Numbers without a + prefix will be interpreted as local {selectedCountry.name} numbers ({selectedCountry.dialCode}).
                  Numbers that already start with + are always kept as-is. Comma-separated numbers in one cell are split into primary + alternate numbers.
                </p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCountryDrop((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-dm focus:outline-none focus:border-electric-blue">
                    <span>{selectedCountry.name} <span className="text-slate-400">({selectedCountry.dialCode})</span></span>
                    <ChevronDown size={14} className="text-slate-400" />
                  </button>
                  {showCountryDrop && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-slate-100">
                        <input
                          autoFocus
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country..."
                          className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg font-dm focus:outline-none focus:border-electric-blue" />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.map((c) => (
                          <button key={c.code} type="button"
                            onClick={() => { setCountryCode(c.code); setShowCountryDrop(false); setCountrySearch(''); }}
                            className={`w-full text-left px-4 py-2 text-sm font-dm hover:bg-slate-50 flex items-center justify-between ${c.code === countryCode ? 'bg-blue-50 text-electric-blue font-medium' : 'text-navy'}`}>
                            <span>{c.name}</span>
                            <span className="text-slate-400 text-xs">{c.dialCode}</span>
                          </button>
                        ))}
                        {filteredCountries.length === 0 && <p className="px-4 py-3 text-xs text-slate-400 font-dm">No countries match</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data preview */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {csvData.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-slate-gray font-semibold text-left border-b border-slate-200 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.slice(0, 2).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {csvData.headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-navy font-dm max-w-[120px] truncate" title={row[h]}>{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Column mapping */}
              <div>
                <p className="text-xs font-semibold text-navy font-dm mb-2">Map CSV columns to lead fields</p>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {csvData.headers.map((h) => (
                    <div key={h} className="flex items-center gap-3">
                      <span className="w-36 text-xs font-medium text-navy font-dm truncate flex-shrink-0" title={h}>{h}</span>
                      <span className="text-slate-300 text-sm flex-shrink-0">→</span>
                      <select
                        value={mapping[h] || ''}
                        onChange={(e) => setMapping((p) => ({ ...p, [h]: e.target.value }))}
                        className={`flex-1 px-2 py-1.5 border rounded-lg text-xs font-dm bg-white focus:outline-none focus:border-electric-blue ${mapping[h] ? 'border-electric-blue bg-blue-50/30' : 'border-slate-200'}`}>
                        <option value="">— Skip —</option>
                        {FIELDS.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phone preview */}
              {phoneColumn && phonePreview.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 font-dm mb-2">Phone normalization preview</p>
                  <div className="space-y-1.5">
                    {phonePreview.map((pv, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs font-dm">
                        <span className="text-slate-400 font-mono truncate max-w-[140px]" title={pv.raw}>{pv.raw || '(empty)'}</span>
                        <span className="text-slate-300">→</span>
                        {pv.valid ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-emerald-700 font-mono font-medium">{pv.primary}</span>
                            {pv.extras.map((e, ei) => (
                              <span key={ei} className="text-blue-600 font-mono">+ alt: {e}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Cannot normalize</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!canImport && (
                <p className="text-xs text-amber-600 font-dm flex items-center gap-1">
                  <AlertCircle size={12} /> Map at least <strong>Full Name</strong> and <strong>Phone</strong> to continue.
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Progress / Results ── */}
          {step === 3 && (
            <div className="text-center py-8">
              {importing ? (
                <>
                  <p className="font-semibold text-navy font-dm mb-4">Importing leads...</p>
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                    <div className="bg-electric-blue h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
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
                      { label: 'Imported',   value: result.importedRows,  color: 'text-emerald-600' },
                      { label: 'Duplicates', value: result.duplicateRows, color: 'text-amber-600' },
                      { label: 'Invalid',    value: result.invalidRows,   color: 'text-red-600' },
                    ].map((s) => (
                      <div key={s.label} className="bg-slate-50 rounded-lg p-3">
                        <p className={`text-xl font-bold font-bricolage ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-slate-gray font-dm">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {result.errors.length > 0 && (
                    <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 font-dm mb-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {result.errors.length} rows skipped
                      </p>
                      {result.errors.slice(0, 5).map((e, i) => (
                        <p key={i} className="text-xs text-amber-700 font-dm">Row {e.row}: {e.reason}</p>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          {step === 1 && (
            <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-gray font-dm hover:bg-slate-50">
              Close
            </button>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-gray font-dm hover:bg-slate-50">
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={!canImport}
                className="flex-1 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium disabled:opacity-60 transition-all">
                Import {csvData?.rows.length} Leads
              </button>
            </>
          )}
          {step === 3 && result && (
            <button onClick={() => { reset(); onClose(); }} className="flex-1 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
