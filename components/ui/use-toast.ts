'use client';
import { useState, useCallback } from 'react';

interface Toast { id: string; title: string; description?: string; variant?: 'default' | 'destructive'; }

let globalToastFn: ((t: Omit<Toast, 'id'>) => void) | null = null;

export function useToast() {
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    if (globalToastFn) globalToastFn(t);
  }, []);
  return { toast };
}

export function useToastState() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = String(Date.now());
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 4000);
  }, []);

  globalToastFn = addToast;

  return { toasts, dismiss: (id: string) => setToasts((p) => p.filter((x) => x.id !== id)) };
}
