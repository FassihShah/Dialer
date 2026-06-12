'use client';
import { useToastState } from './use-toast';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Toaster() {
  const { toasts, dismiss } = useToastState();
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={cn('flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-dm pointer-events-auto animate-in slide-in-from-bottom-4 duration-300 min-w-72 max-w-sm',
            t.variant === 'destructive' ? 'bg-red-600 text-white border-red-500' : 'bg-white text-navy border-slate-200')}>
          {t.variant === 'destructive' ? <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> : <CheckCircle size={16} className="flex-shrink-0 mt-0.5 text-emerald-500" />}
          <div className="flex-1">
            <p className="font-semibold">{t.title}</p>
            {t.description && <p className={cn('text-xs mt-0.5', t.variant === 'destructive' ? 'text-red-100' : 'text-slate-500')}>{t.description}</p>}
          </div>
          <button onClick={() => dismiss(t.id)} className="p-0.5 rounded opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
