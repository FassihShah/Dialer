'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { PhoneCall, Clock, CheckCircle, Loader2, LogOut } from 'lucide-react';

export default function PendingPage() {
  const { data: session, update } = useSession();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);
  const redirectingRef = useRef(false);

  const checkStatus = async (silent = false) => {
    if (redirectingRef.current) return;
    if (!silent) { setChecking(true); setStillPending(false); }

    try {
      // Ask the server directly — avoids stale client-side state
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data?.status === 'active') {
        redirectingRef.current = true;
        // Refresh the JWT cookie then hard-navigate
        await update();
        window.location.href = '/';
        return;
      }
    } catch { /* network blip — ignore */ }

    if (!silent) { setChecking(false); setStillPending(true); }
  };

  // Auto-poll every 10 seconds so the user is redirected without manual action
  useEffect(() => {
    const id = setInterval(() => checkStatus(true), 10_000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-blue rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
          <PhoneCall size={28} className="text-white" />
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-center w-14 h-14 bg-amber-100 rounded-full mx-auto mb-4">
            <Clock size={26} className="text-amber-600" />
          </div>

          <h2 className="text-xl font-bold text-navy font-bricolage mb-2">Account Pending Setup</h2>
          <p className="text-slate-500 text-sm font-dm mb-1">
            Hi <span className="font-semibold text-navy">{session?.user?.name || session?.user?.email}</span>,
          </p>
          <p className="text-slate-500 text-sm font-dm mb-6">
            Your account has been created and is waiting to be added to a workspace. Once a platform administrator places you in a workspace, you&apos;ll get access to the dialer.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
              <span className="text-xs text-slate-600 font-dm">Account created successfully</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-500 flex-shrink-0" />
              <span className="text-xs text-slate-600 font-dm">Waiting to be added to a workspace</span>
            </div>
          </div>

          {stillPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-amber-700 text-sm font-dm">Still pending — please check back later.</p>
            </div>
          )}

          <button onClick={() => checkStatus(false)} disabled={checking}
            className="w-full py-3 bg-electric-blue hover:bg-blue-700 text-white font-semibold rounded-xl font-dm transition-all flex items-center justify-center gap-2 disabled:opacity-70 mb-3">
            {checking ? <><Loader2 size={16} className="animate-spin" /> Checking...</> : 'Check Approval Status'}
          </button>

          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-xl font-dm transition-all flex items-center justify-center gap-2 text-sm">
            <LogOut size={14} /> Sign Out
          </button>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6 font-dm">Powered by SignalWire</p>
      </div>
    </div>
  );
}
