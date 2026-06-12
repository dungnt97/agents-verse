/* =========================================================================
   AGENTS VERSE — Toast provider
   Ports useToasts + ToastHost from components.jsx into a context-backed
   provider. Exposes useToast() returning push(msg, kind?) to consumers.
   Math.random() for toast IDs — client-only, safe behind 'use client'.
   ========================================================================= */
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Icon } from '@/components/brand/icon';

export type ToastKind = 'success' | 'warning' | 'danger';

interface Toast {
  id: string;
  msg: string;
  kind: string;
}

// Legacy onAction(label, severity) accepted any string severity; ToastHost special-cases
// 'warning'/'danger' and defaults the rest to success styling. Keep the public signature wide.
type PushFn = (msg: string, kind?: string) => void;

const ToastContext = createContext<PushFn | null>(null);

function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      {toasts.map(t => (
        <div key={t.id} className="card-elev row" style={{
          gap: 11, padding: '12px 15px', minWidth: 240, maxWidth: 360, animation: 'fade-up .35s cubic-bezier(.2,.8,.2,1)',
          borderColor: t.kind === 'warning' ? 'var(--warning)' : t.kind === 'danger' ? 'var(--danger)' : 'var(--border)',
        }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', flex: 'none',
            background: t.kind === 'warning' ? 'var(--warning-soft)' : t.kind === 'danger' ? 'var(--danger-soft)' : 'var(--success-soft)',
            color: t.kind === 'warning' ? 'var(--warning)' : t.kind === 'danger' ? 'var(--danger)' : 'var(--success)' }}>
            <Icon name={t.kind === 'warning' ? 'alert' : 'check'} size={15} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<PushFn>((msg, kind = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <ToastHost toasts={toasts} />
    </ToastContext.Provider>
  );
}

/** Returns the push(msg, kind?) function. Must be used inside <ToastProvider>. */
export function useToast(): PushFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
