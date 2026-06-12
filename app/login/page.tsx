'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PhoneCall, Loader2 } from 'lucide-react';
import Link from 'next/link';
// Google OAuth removed — email/password only

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) { setError('Invalid email or password'); return; }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-blue rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <PhoneCall size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white font-bricolage">Smart Logics Dialer</h1>
          <p className="text-slate-400 text-sm mt-1 font-dm">Cold Calling CRM & Dialer Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-navy font-bricolage mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1.5 font-dm">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-dm focus:outline-none focus:ring-2 focus:ring-electric-blue/30 focus:border-electric-blue transition-all"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-gray uppercase tracking-wider mb-1.5 font-dm">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-dm focus:outline-none focus:ring-2 focus:ring-electric-blue/30 focus:border-electric-blue transition-all"
                placeholder="••••••••" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-700 text-sm font-dm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-electric-blue hover:bg-blue-700 text-white font-semibold rounded-xl font-dm transition-all flex items-center justify-center gap-2 disabled:opacity-70 shadow-md shadow-blue-500/20 mt-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 font-dm mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-electric-blue hover:underline font-medium">Create account</Link>
          </p>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6 font-dm">Powered by SignalWire</p>
      </div>
    </div>
  );
}
