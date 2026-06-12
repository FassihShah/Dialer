'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, RefreshCw, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface VoIPConfig {
  id?: string;
  projectId: string;
  apiToken: string;
  spaceUrl: string;
  sharedSubscriberReference: string;
  sharedSubscriberPassword: string;
  signalwireNumber: string;
  dialAddress: string;
  active: boolean;
}

export default function SettingsClient() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<VoIPConfig>>({ active: true });
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string; numbers?: unknown[] } | null>(null);
  const [syncingNumbers, setSyncingNumbers] = useState(false);

  const { data: configData, isLoading } = useQuery<VoIPConfig | null>({
    queryKey: ['voip_config'],
    queryFn: async () => {
      const r = await fetch('/api/admin/settings');
      if (!r.ok) return null;
      const data = await r.json();
      return data ?? null;
    },
    staleTime: 0, // always fetch fresh on mount
  });

  // Always populate form when server data arrives or changes
  useEffect(() => {
    if (configData) {
      setForm({ ...configData, active: true });
    }
  }, [configData]);

  const save = useMutation({
    mutationFn: async (data: Partial<VoIPConfig>) => {
      const r = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, active: true }),
      });
      if (!r.ok) throw new Error((await r.json()).error || 'Save failed');
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['voip_config'] });
      toast({ title: 'Settings saved', description: 'VoIP configuration saved successfully.' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const testConnection = async () => {
    setTestResult(null);
    try {
      const r = await fetch('/api/signalwire/numbers');
      const d = await r.json();
      if (d.success) {
        setTestResult({ ok: true, msg: `Connected! Found ${d.numbers?.length ?? 0} phone number${d.numbers?.length !== 1 ? 's' : ''}.`, numbers: d.numbers });
      } else {
        setTestResult({ ok: false, msg: d.error || 'Connection failed' });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: String(e) });
    }
  };

  const syncNumbers = async () => {
    if (!testResult?.numbers) return;
    setSyncingNumbers(true);
    try {
      const payload = testResult.numbers.map((n: unknown) => {
        const num = n as { phone_number: string; friendly_name: string; sid: string; country?: string; country_code?: string };
        return { phoneNumber: num.phone_number, label: num.friendly_name || num.phone_number, signalwireSid: num.sid, country: num.country || null, countryCode: num.country_code || null };
      });
      const resp = await fetch('/api/admin/numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const respData = await resp.json();
      const saved = Array.isArray(respData) ? respData.filter((r) => r.id).length : 0;
      if (resp.ok) {
        qc.invalidateQueries({ queryKey: ['admin_numbers'] });
        toast({ title: 'Numbers synced', description: `${saved} of ${testResult.numbers.length} number(s) saved to Phone Numbers.` });
        setTestResult((p) => p ? { ...p, msg: p.msg + ' Numbers synced — visit Phone Numbers page to see them.' } : p);
      }
    } catch {
      toast({ title: 'Sync failed', variant: 'destructive' });
    } finally {
      setSyncingNumbers(false);
    }
  };

  const set = (k: keyof VoIPConfig, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const fields: Array<{ key: keyof VoIPConfig; label: string; placeholder: string; type?: string; note?: string }> = [
    { key: 'projectId',                 label: 'Project ID',                     placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', note: 'Found in SignalWire Dashboard → API' },
    { key: 'apiToken',                  label: 'API Token',                      placeholder: '••••••••', type: 'password', note: 'Your SignalWire API token' },
    { key: 'spaceUrl',                  label: 'Space URL',                      placeholder: 'yourspace.signalwire.com', note: 'Without https://' },
    { key: 'sharedSubscriberReference', label: 'Shared Subscriber Reference',    placeholder: 'subscriber@yourspace.com', note: 'Fabric subscriber used by all agents for browser calls' },
    { key: 'sharedSubscriberPassword',  label: 'Shared Subscriber Password',     placeholder: '••••••••', type: 'password' },
    { key: 'signalwireNumber',          label: 'Default Outbound Caller ID',     placeholder: '+12125551234', note: 'E.164 format — used when a user has no assigned number' },
    { key: 'dialAddress',               label: 'SWML Script Address (Dial Address)', placeholder: `${typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/signalwire/swml`, note: 'The SWML endpoint URL — browser dials this to get call routing' },
  ];

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-blue-200 border-t-electric-blue rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
          <Settings size={18} className="text-electric-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy font-bricolage">Dialer Settings</h1>
          <p className="text-xs text-slate-gray font-dm">Configure SignalWire VoIP integration</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1.5 font-dm">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={String(form[f.key] ?? '')}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-dm font-mono focus:outline-none focus:border-electric-blue focus:ring-2 focus:ring-electric-blue/20 transition-all"
              />
              {f.note && <p className="text-xs text-slate-400 font-dm mt-1">{f.note}</p>}
            </div>
          ))}

          {/* Test result */}
          {testResult && (
            <div className={`rounded-lg border p-3 ${testResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-start gap-2">
                {testResult.ok
                  ? <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm font-dm flex-1 ${testResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>{testResult.msg}</p>
              </div>
              {testResult.ok && testResult.numbers && testResult.numbers.length > 0 && (
                <button onClick={syncNumbers} disabled={syncingNumbers}
                  className="mt-2 ml-6 flex items-center gap-1.5 text-xs font-dm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 disabled:opacity-60">
                  {syncingNumbers ? <RefreshCw size={11} className="animate-spin" /> : <Download size={11} />}
                  Import {testResult.numbers.length} number{testResult.numbers.length !== 1 ? 's' : ''} to Phone Numbers
                </button>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.projectId || !form.apiToken || !form.spaceUrl}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium transition-all disabled:opacity-60">
              {save.isPending ? <><RefreshCw size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Configuration</>}
            </button>
            <button onClick={testConnection}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-dm transition-all">
              Test Connection
            </button>
          </div>
        </div>

        {/* Webhook URLs info */}
        <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-800 font-dm mb-2">SignalWire Webhook URLs</p>
          <p className="text-xs text-blue-700 font-dm mb-2">Set these in your SignalWire phone number settings:</p>
          <div className="space-y-1.5">
            <div>
              <p className="text-[10px] text-blue-500 font-dm mb-0.5">SWML Script (Voice Webhook)</p>
              <code className="block text-xs bg-white rounded px-2 py-1 text-blue-900 font-mono border border-blue-200 break-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/signalwire/swml
              </code>
            </div>
            <div>
              <p className="text-[10px] text-blue-500 font-dm mb-0.5">Status Callback</p>
              <code className="block text-xs bg-white rounded px-2 py-1 text-blue-900 font-mono border border-blue-200 break-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/api/signalwire/webhook
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
