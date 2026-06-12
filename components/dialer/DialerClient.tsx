'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Plus, Upload, PhoneCall, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatTimer } from '@/lib/utils';
import type { Lead } from '@/types/dialer';
import LeadListPanel from './LeadListPanel';
import AddLeadModal from './AddLeadModal';
import CSVImportModal from './CSVImportModal';
import AutoDialer from './AutoDialer';
import ManualDialpad from './ManualDialpad';
import CallDialog from './CallDialog';
import FollowUpsList from './FollowUpsList';
import CallHistory from './CallHistory';

const MODES = ['Auto', 'Manual'] as const;
const AREA_TABS = ['Call', 'Follow-ups', 'History'] as const;

function normalizeToE164(raw: string): string | null {
  if (!raw) return null;
  const hasPlus = raw.trim().startsWith('+');
  let cleaned = raw.replace(/[^\d]/g, '');
  if (hasPlus) return '+' + cleaned;
  if (cleaned.startsWith('00')) return '+' + cleaned.substring(2);
  if (cleaned.startsWith('0')) return '+92' + cleaned.substring(1);
  return '+' + cleaned;
}

export default function DialerClient() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<'Auto' | 'Manual'>('Manual');
  const [areaTab, setAreaTab] = useState<'Call' | 'Follow-ups' | 'History'>('Call');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  // SignalWire SDK state
  const [deviceStatus, setDeviceStatus] = useState<'idle' | 'initializing' | 'mic_denied' | 'ready' | 'error'>('idle');
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [dialerReady, setDialerReady] = useState(false);
  const [dialAddress, setDialAddress] = useState<string | null>(null);

  // Call state
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callLead, setCallLead] = useState<Lead | null>(null);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed'>('idle');
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [activeCallLogId, setActiveCallLogId] = useState<string | null>(null);

  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callSidRef = useRef<string | null>(null);
  const swClientRef = useRef<unknown>(null);
  const activeCallRef = useRef<{ hangup: () => Promise<void>; on: (e: string, cb: (s: unknown) => void) => void; start: () => Promise<void>; id?: string } | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const rootElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { callSidRef.current = callSid; }, [callSid]);

  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['dialer_leads'],
    queryFn: () => fetch('/api/leads').then((r) => r.json()),
    refetchInterval: 30_000,
  });

  // ── Initialize SignalWire Browser SDK ───────────────────────────────────────
  useEffect(() => {
    if (!session?.user) return;
    if (swClientRef.current || deviceStatus !== 'idle') return;

    setDeviceStatus('initializing');

    (async () => {
      try {
        const tokenRes = await fetch('/api/signalwire/token', { method: 'POST' });
        const tokenData = await tokenRes.json();
        if (!tokenData?.success || !tokenData?.token) {
          setDeviceError(tokenData?.error || 'Failed to get SignalWire token');
          setDeviceStatus('error');
          return;
        }
        setDialAddress(tokenData.dial_address || null);

        try { await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch { setDeviceStatus('mic_denied'); setDeviceError('Microphone access denied. Allow microphone and refresh.'); return; }

        const swModule = await import('@signalwire/js');
        const swFactory =
          (typeof (swModule as { SignalWire?: unknown }).SignalWire === 'function' && (swModule as { SignalWire: (opts: unknown) => unknown }).SignalWire) ||
          (typeof (swModule as { default?: { SignalWire?: unknown } }).default?.SignalWire === 'function' && (swModule as { default: { SignalWire: (opts: unknown) => unknown } }).default.SignalWire) ||
          (typeof (swModule as { default?: unknown }).default === 'function' && (swModule as unknown as { default: (opts: unknown) => unknown }).default) ||
          null;

        if (!swFactory) throw new Error(`SignalWire factory not found. Module keys: ${Object.keys(swModule).join(', ')}`);

        const client = await (swFactory as (opts: { token: string }) => Promise<unknown>)({ token: tokenData.token });
        swClientRef.current = client;
        setDialerReady(true);
        setDeviceStatus('ready');
      } catch (err) {
        setDeviceError((err as Error).message || 'Failed to initialize SignalWire');
        setDeviceStatus('error');
      }
    })();
  }, [session, deviceStatus]);

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (activeCallRef.current) { try { activeCallRef.current.hangup(); } catch {} }
    };
  }, []);

  const clearCallTimer = () => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
  };

  const handleCallEnded = useCallback(() => {
    clearCallTimer();
    setCallStatus('ended');
    activeCallRef.current = null;
  }, []);

  const showError = (msg: string) => toast({ title: 'Dialer Error', description: msg, variant: 'destructive' });

  // ── Place a browser call ────────────────────────────────────────────────────
  const initiateCall = async (lead: Lead) => {
    const rawPhone = lead.phone || dialNumber;
    if (!rawPhone) return;
    if (!dialerReady || !swClientRef.current) { showError('Dialer not ready. Wait for initialization.'); return; }
    if (!dialAddress) { showError('No dial_address configured. Set it in Admin → Settings → SWML Script Address.'); return; }
    if (['initiating', 'ringing', 'connected'].includes(callStatus)) { showError('A call is already in progress.'); return; }

    const e164 = normalizeToE164(rawPhone);
    if (!e164 || e164.length < 9) { showError('Invalid phone number. Enter a valid international number.'); return; }

    setCallLead(lead);
    setCallStatus('initiating');
    setCallDuration(0);
    setCallSid(null);
    setCallDialogOpen(true);

    // Fabric SDK: pass call data via userVariables (delivered to the SWML script).
    // Dial the bare resource address — query strings can break Fabric address resolution.
    const userVariables = {
      lead_phone: e164,
      lead_name: lead.fullName || '',
      lead_company: lead.companyName || '',
      dialer_lead_id: lead.id || '',
      user_id: session?.user.id || '',
      caller_id: session?.user.id || '',
    };

    try {
      const call = await (swClientRef.current as { dial: (opts: object) => Promise<typeof activeCallRef.current> }).dial({
        to: dialAddress,
        audio: true,
        video: false,
        negotiateVideo: false,
        rootElement: rootElementRef.current, // SDK auto-attaches remote audio here
        userVariables,
      });

      activeCallRef.current = call;

      // Fallback manual audio attach (in case rootElement isn't used by SDK version)
      call?.on('track', (event: unknown) => {
        const e = event as RTCTrackEvent;
        if (remoteAudioRef.current && e.streams?.[0]) {
          remoteAudioRef.current.srcObject = e.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      });

      // Authoritative call lifecycle event in the Fabric SDK: `call.state`
      // call_state ∈ created | ringing | answered | ending | ended
      call?.on('call.state', (evt: unknown) => {
        const p = evt as { call_state?: string; call_id?: string };
        if (p.call_id) { setCallSid(p.call_id); callSidRef.current = p.call_id; }
        switch (p.call_state) {
          case 'created':
          case 'ringing':
            setCallStatus('ringing');
            break;
          case 'answered': {
            setCallStatus('connected');
            const startTime = Date.now();
            setCallStartTime(startTime);
            clearCallTimer();
            callTimerRef.current = setInterval(() => setCallDuration(Math.floor((Date.now() - startTime) / 1000)), 1000);
            break;
          }
          case 'ending':
          case 'ended':
            handleCallEnded();
            break;
        }
      });

      // The room/connection ending — ensures cleanup even if call.state is missed.
      call?.on('call.left', () => handleCallEnded());

      await call?.start();
      if (call?.id) { setCallSid(call.id); callSidRef.current = call.id; }
      setCallStatus('ringing');
    } catch (err) {
      showError((err as Error).message || 'Failed to place call.');
      setCallStatus('failed');
      activeCallRef.current = null;
      setTimeout(() => setCallStatus('idle'), 3000);
    }
  };

  const handleHangup = async () => {
    clearCallTimer();
    const sid = callSidRef.current;
    if (activeCallRef.current) { try { await activeCallRef.current.hangup(); } catch {} activeCallRef.current = null; }
    if (sid) {
      await fetch('/api/calls/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callId: sid, durationSeconds: callDuration }) }).catch(() => {});
    }
    handleCallEnded();
  };

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createLeadMutation = useMutation({
    mutationFn: async (data: object) => {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error || 'Failed to add lead');
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dialer_leads'] }); toast({ title: 'Lead added to dialer' }); },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      fetch(`/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dialer_leads'] }),
  });

  const saveCallLog = async (payload: {
    outcome: string; notes: string; callDuration: number; followUp: boolean;
    followUpDate: string; followUpTime: string; followUpNotes: string;
  }, lead: Lead) => {
    const r = await fetch('/api/calls/outcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        callLogId: activeCallLogId,
        callSid: callSid || callSidRef.current,
        outcome: payload.outcome,
        notes: payload.notes,
        durationSeconds: payload.callDuration,
        followUp: payload.followUp,
        followUpDate: payload.followUpDate || null,
        followUpTime: payload.followUpTime || null,
        followUpNotes: payload.followUpNotes || null,
      }),
    });
    if (!r.ok) { const err = await r.json(); throw new Error(err.error || 'Failed to save'); }
    const data = await r.json();
    setActiveCallLogId(data.callLogId);
    qc.invalidateQueries({ queryKey: ['dialer_leads'] });
    qc.invalidateQueries({ queryKey: ['call_logs'] });
  };

  const handleSave = async (payload: Parameters<typeof saveCallLog>[0]) => {
    if (!callLead) return;
    await saveCallLog(payload, callLead);
    setCallDialogOpen(false);
    setCallStatus('idle');
    setCallDuration(0);
    setActiveCallLogId(null);
  };

  const handleSaveNext = async (payload: Parameters<typeof saveCallLog>[0]) => {
    if (!callLead) return;
    await saveCallLog(payload, callLead);
    setCallDialogOpen(false);
    setCallStatus('idle');
    setCallDuration(0);
    setActiveCallLogId(null);
    if (mode === 'Auto' && autoRunning && !autoPaused) {
      const remaining = leads.filter((l) => !l.calledInSession && l.status !== 'do_not_call' && l.id !== callLead.id);
      if (remaining.length === 0) { setSessionComplete(true); setAutoRunning(false); return; }
      setTimeout(() => initiateCall(remaining[0]), 3000);
    }
  };

  const handleLeadCall = (lead: Lead) => {
    if (mode === 'Manual') { setSelectedLead(lead); setDialNumber(lead.phone); }
    else initiateCall(lead);
  };

  const handleFollowUpCall = (fu: { leadId: string; lead: Lead }) => {
    const lead = leads.find((l) => l.id === fu.leadId) || fu.lead;
    if (lead) { setAreaTab('Call'); handleLeadCall(lead); }
  };

  const resetSession = async () => {
    for (const lead of leads) {
      if (lead.calledInSession) {
        await fetch(`/api/leads/${lead.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calledInSession: false }) });
      }
    }
    qc.invalidateQueries({ queryKey: ['dialer_leads'] });
    setSessionComplete(false); setAutoRunning(false); setAutoPaused(false);
  };

  const [tooNarrow, setTooNarrow] = useState(false);
  useEffect(() => {
    const check = () => setTooNarrow(window.innerWidth < 1200);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (tooNarrow) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center"><PhoneCall size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-navy font-dm">Please use a wider screen</p>
          <p className="text-xs text-slate-400 font-dm mt-1">The Dialer requires at least 1200px width</p>
        </div>
      </div>
    );
  }

  const callInProgress = ['initiating', 'ringing', 'connected'].includes(callStatus);

  const statusDot = ({
    idle: { color: 'bg-slate-300', label: 'Initializing...' },
    initializing: { color: 'bg-amber-400 animate-pulse', label: 'Connecting...' },
    ready: { color: 'bg-green-500', label: 'Ready' },
    mic_denied: { color: 'bg-red-500', label: 'Mic denied' },
    error: { color: 'bg-red-500', label: 'Error' },
  } as const)[deviceStatus];

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh)' }}>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      <div ref={rootElementRef} style={{ display: 'none' }} />

      {deviceStatus === 'mic_denied' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
          <MicOff size={16} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800 font-dm">Microphone access denied. Allow microphone in browser settings and refresh.</p>
        </div>
      )}
      {deviceStatus === 'error' && deviceError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <PhoneCall size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-dm">{deviceError}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-navy font-bricolage">Dialer</h1>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full inline-block ${statusDot.color}`} />
            <span className="text-xs font-dm text-slate-gray">{statusDot.label}</span>
            {deviceStatus === 'ready' && <span className="flex items-center gap-1 text-xs text-green-600 font-dm"><Mic size={12} /> Browser audio</span>}
            {callStatus === 'initiating' && <span className="text-xs text-blue-600 animate-pulse font-dm">Connecting...</span>}
            {callStatus === 'ringing' && <span className="text-xs text-blue-600 animate-pulse font-dm">📳 Ringing...</span>}
            {callStatus === 'connected' && <span className="text-xs text-green-600 font-medium font-dm">🟢 Connected — {formatTimer(callDuration)}</span>}
            <span className="text-[10px] text-slate-400 font-dm">Powered by SignalWire</span>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 rounded-xl p-1">
          {MODES.map((m) => (
            <button key={m} onClick={() => { setMode(m); setAreaTab('Call'); }}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium font-dm transition-all ${mode === m ? 'bg-navy text-white shadow-sm' : 'text-slate-500 hover:text-navy'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-gray font-dm hover:bg-slate-50 transition-colors">
            <Upload size={14} /> Import Leads
          </button>
          <button onClick={() => setAddLeadOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-electric-blue hover:bg-blue-700 text-white text-sm rounded-lg font-dm font-medium transition-colors">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        <LeadListPanel leads={leads} selectedLead={selectedLead} onSelect={(l) => setSelectedLead(l)} onCall={handleLeadCall} mode={mode.toLowerCase() as 'auto' | 'manual'} isLoading={leadsLoading} />

        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 flex-shrink-0">
            {AREA_TABS.map((t) => (
              <button key={t} onClick={() => setAreaTab(t)}
                className={`px-4 py-1.5 text-sm rounded-lg font-dm font-medium transition-colors ${areaTab === t ? 'bg-electric-blue text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {areaTab === 'Call' && mode === 'Auto' && (
              <AutoDialer leads={leads} onCall={(l) => initiateCall(l)} onSkip={(l) => l && updateLeadMutation.mutate({ id: l.id, data: { calledInSession: true } })}
                isRunning={autoRunning} isPaused={autoPaused}
                onStart={() => { setAutoRunning(true); setAutoPaused(false); }}
                onStop={() => { setAutoRunning(false); setAutoPaused(false); }}
                onPause={() => setAutoPaused(true)} onResume={() => setAutoPaused(false)}
                sessionComplete={sessionComplete} onResetSession={resetSession} hasAssignedNumber={dialerReady} />
            )}
            {areaTab === 'Call' && mode === 'Manual' && (
              <div className="flex items-center justify-center p-8 min-h-full">
                <ManualDialpad
                  number={dialNumber} onNumberChange={setDialNumber}
                  onCall={() => {
                    const matched = leads.find((l) => l.phone === dialNumber || l.phone.replace(/\s/g, '') === dialNumber.replace(/\s/g, ''));
                    initiateCall(matched || { id: '', fullName: 'Manual Call', phone: dialNumber, companyName: null, companyWebsite: null, email: null, jobTitle: null, industry: null, region: null, notes: null, status: 'new', callCount: 0, lastCalledAt: null, followUpDate: null, calledInSession: false, queueOrder: 0 });
                  }}
                  selectedLead={selectedLead?.phone === dialNumber ? selectedLead : null}
                  onClearLead={() => setSelectedLead(null)}
                  assignedPhoneNumber={dialerReady ? { phoneNumber: 'Browser audio', label: '🎙' } : { phoneNumber: 'Connecting...', label: '⏳' }}
                  callInProgress={callInProgress}
                />
              </div>
            )}
            {areaTab === 'Follow-ups' && <FollowUpsList onCallLead={handleFollowUpCall} />}
            {areaTab === 'History' && <CallHistory />}
          </div>
        </div>
      </div>

      <AddLeadModal open={addLeadOpen} onClose={() => setAddLeadOpen(false)} onAdd={(data) => createLeadMutation.mutateAsync(data)} />
      <CSVImportModal open={importOpen} onClose={() => setImportOpen(false)} onRefresh={() => qc.invalidateQueries({ queryKey: ['dialer_leads'] })} />

      <CallDialog
        open={callDialogOpen} lead={callLead} callStatus={callStatus} callDuration={callDuration}
        onHangup={handleHangup} onSave={handleSave} onSaveNext={handleSaveNext}
        callingFromNumber="Browser"
      />
    </div>
  );
}
