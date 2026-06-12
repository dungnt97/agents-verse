/* =========================================================================
   AGENTS VERSE — MarketingFrame
   Shared chrome for public-facing routes (landing, info pages, login).
   Mirrors the landing branch in app.jsx: renders children + ChatWidget +
   DemoRequestModal controlled by local reqOpen state.
   Exposes useRequestDemo() context so any descendant can open the modal
   without prop-drilling.
   ToastHost is NOT rendered here — it already lives inside ToastProvider
   in app/providers.tsx (global).
   ========================================================================= */
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ChatWidget } from './chat-widget';
import { DemoRequestModal } from './demo-request-modal';

/* Context lets any descendant open the demo modal without prop-drilling */
interface RequestDemoCtx {
  open: () => void;
}

const RequestDemoContext = createContext<RequestDemoCtx | null>(null);

/** Returns { open } to trigger the DemoRequestModal from any descendant. */
export function useRequestDemo(): RequestDemoCtx {
  const ctx = useContext(RequestDemoContext);
  if (!ctx) throw new Error('useRequestDemo must be used inside <MarketingFrame>');
  return ctx;
}

interface MarketingFrameProps {
  children: ReactNode;
}

export function MarketingFrame({ children }: MarketingFrameProps) {
  const [reqOpen, setReqOpen] = useState(false);

  const open = useCallback(() => setReqOpen(true), []);

  return (
    <RequestDemoContext.Provider value={{ open }}>
      {children}
      <ChatWidget />
      <DemoRequestModal open={reqOpen} onClose={() => setReqOpen(false)} />
    </RequestDemoContext.Provider>
  );
}
