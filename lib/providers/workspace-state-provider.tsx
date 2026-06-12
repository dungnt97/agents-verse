/* =========================================================================
   AGENTS VERSE — WorkspaceStateProvider + useWorkspaceState()
   Ports the mutable app-level state from app.jsx (~lines 87-110):
     - mode       (av-mode localStorage, default 'guarded')
     - requests   (av-requests localStorage, seeded from AV.demoRequests when absent)
     - leads      (av-leads localStorage, seeded from AV.leads)
     - badges     (command: 3 fixed, requests: count of status==='new')
   SSR-safe: state is initialized from static AV seeds (no localStorage read);
   useEffect hydrates from localStorage after mount to avoid hydration mismatch.
   ========================================================================= */
'use client';

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { AV } from '@/lib/data';
import type { DemoRequest, Lead } from '@/lib/data/types';

/* -------------------------------------------------------------------------
   Context shape
   ------------------------------------------------------------------------- */

interface Badges {
  command: number;
  requests: number | undefined;
}

interface WorkspaceStateContextValue {
  mode: string;
  setMode: (mode: string) => void;
  requests: DemoRequest[];
  setRequests: React.Dispatch<React.SetStateAction<DemoRequest[]>>;
  addRequest: (data: Partial<DemoRequest> & { business: string; industry: string; city?: string }) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  addLead: (r: { business: string; industry: string; city?: string; url?: string }) => void;
  badges: Badges;
}

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(null);

/* -------------------------------------------------------------------------
   Safe localStorage helpers — guard for SSR and private-mode browsers
   ------------------------------------------------------------------------- */

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage quota exceeded — silently ignore */
  }
}

/* -------------------------------------------------------------------------
   Provider
   ------------------------------------------------------------------------- */

export function WorkspaceStateProvider({ children }: { children: ReactNode }) {
  // Initialize from static seeds (SSR-safe). Effects below override with
  // localStorage values after the first client mount.
  const [mode, setModeState] = useState<string>('guarded');
  const [requests, setRequests] = useState<DemoRequest[]>(AV.demoRequests);
  const [leads, setLeads] = useState<Lead[]>(AV.leads);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage once mounted on the client.
  // Mirrors the legacy LS() helper pattern: use stored value if present,
  // otherwise keep the AV seed (av-requests / av-leads empty-seed behavior).
  useEffect(() => {
    setModeState(localStorage.getItem('av-mode') || 'guarded');
    setRequests(lsGet<DemoRequest[]>('av-requests', AV.demoRequests));
    setLeads(lsGet<Lead[]>('av-leads', AV.leads));
    setMounted(true);
  }, []);

  // Persist mode to localStorage whenever it changes (after mount)
  useEffect(() => {
    if (!mounted) return;
    lsSet('av-mode', mode);
  }, [mode, mounted]);

  // Persist requests to localStorage whenever they change (after mount)
  useEffect(() => {
    if (!mounted) return;
    lsSet('av-requests', requests);
  }, [requests, mounted]);

  // Persist leads to localStorage whenever they change (after mount)
  useEffect(() => {
    if (!mounted) return;
    lsSet('av-leads', leads);
  }, [leads, mounted]);

  const setMode = useCallback((next: string) => {
    setModeState(next);
  }, []);

  // Mirrors app.jsx — prepend new request with generated id/timestamp/status
  const addRequest = useCallback(
    (data: Partial<DemoRequest> & { business: string; industry: string; city?: string }) => {
      setRequests(x => [
        { ...data, id: 'rq' + Date.now(), t: 'just now', status: 'new', city: data.city || '—' } as DemoRequest,
        ...x,
      ]);
    },
    [],
  );

  // Mirrors app.jsx — dedupe by company name; prepend with default lead shape
  const addLead = useCallback(
    (r: { business: string; industry: string; city?: string; url?: string }) => {
      setLeads(x =>
        x.find(l => l.company === r.business)
          ? x
          : [
              {
                id: 'lead-' + Date.now(),
                company: r.business,
                industry: r.industry,
                city: r.city || '—',
                url: r.url || '(no site yet)',
                site: 38,
                score: 84,
                value: 2400,
                agent: 'vega',
                stage: 'audited',
                demo: 'draft',
              } satisfies Lead,
              ...x,
            ],
      );
    },
    [],
  );

  // badges.requests = count of status==='new', or undefined when 0 (mirrors app.jsx)
  const newReqCount = requests.filter(r => r.status === 'new').length;
  const badges: Badges = {
    command: 3,
    requests: newReqCount || undefined,
  };

  return (
    <WorkspaceStateContext.Provider
      value={{ mode, setMode, requests, setRequests, addRequest, leads, setLeads, addLead, badges }}
    >
      {children}
    </WorkspaceStateContext.Provider>
  );
}

/* -------------------------------------------------------------------------
   Hook
   ------------------------------------------------------------------------- */

export function useWorkspaceState(): WorkspaceStateContextValue {
  const ctx = useContext(WorkspaceStateContext);
  if (!ctx) throw new Error('useWorkspaceState must be used within <WorkspaceStateProvider>');
  return ctx;
}
