/* =========================================================================
   AGENTS VERSE — WorkspaceStateProvider + useWorkspaceState()
   Mutable app-level state: mode (autonomy), requests (inbound), leads, badges.
   Dual-mode, seeded from the server (props) so SSR matches hydration:
     - DB mode (useDb): the database is the source of truth. Writes go through
       server actions (createLead/createDemoRequest/setAutonomyMode) with an
       optimistic local update; no localStorage.
     - Demo mode (no DB): preserves the prototype — seeds from the mock (via
       props) and persists to localStorage so added leads/requests survive reload.
   ========================================================================= */
'use client';

import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react';
import { createLead, updateLeadStage } from '@/lib/actions/leads';
import { createDemoRequest, updateRequestStatus, convertRequestToLead } from '@/lib/actions/requests';
import { setAutonomyMode } from '@/lib/actions/settings';
import type { DemoRequest, Lead } from '@/lib/data/types';

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
  setRequestStatus: (id: string, status: string) => void;
  convertRequest: (id: string) => void;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  addLead: (r: { business: string; industry: string; city?: string; url?: string }) => void;
  moveLead: (leadId: string, stage: string) => void;
  // Exposed so directly-wired screens can fall back to a cosmetic toast in demo mode (no DB)
  // instead of calling a server action that would degrade to a "needs DB" warning.
  useDb: boolean;
  badges: Badges;
}

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(null);

const AUTONOMY_IDS = ['manual', 'review', 'guarded', 'full'];

/* Safe localStorage helpers — guard for SSR and private-mode browsers (demo mode only) */
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

export interface WorkspaceStateProviderProps {
  initialLeads: Lead[];
  initialRequests: DemoRequest[];
  initialMode: string;
  useDb: boolean;
  children: ReactNode;
}

export function WorkspaceStateProvider({
  initialLeads,
  initialRequests,
  initialMode,
  useDb,
  children,
}: WorkspaceStateProviderProps) {
  const [mode, setModeState] = useState<string>(initialMode);
  const [requests, setRequests] = useState<DemoRequest[]>(initialRequests);
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [mounted, setMounted] = useState(false);

  // Demo mode only: hydrate from localStorage after mount (DB mode trusts the server props).
  useEffect(() => {
    if (useDb) return;
    const storedMode = localStorage.getItem('av-mode');
    setModeState(AUTONOMY_IDS.includes(storedMode ?? '') ? (storedMode as string) : initialMode);
    setRequests(lsGet<DemoRequest[]>('av-requests', initialRequests));
    setLeads(lsGet<Lead[]>('av-leads', initialLeads));
    setMounted(true);
  }, [useDb, initialMode, initialRequests, initialLeads]);

  // Demo-mode persistence (raw string for mode so it round-trips without re-escaping).
  useEffect(() => {
    if (useDb || !mounted) return;
    try { localStorage.setItem('av-mode', mode); } catch { /* private mode */ }
  }, [mode, mounted, useDb]);
  useEffect(() => {
    if (useDb || !mounted) return;
    lsSet('av-requests', requests);
  }, [requests, mounted, useDb]);
  useEffect(() => {
    if (useDb || !mounted) return;
    lsSet('av-leads', leads);
  }, [leads, mounted, useDb]);

  const setMode = useCallback(
    (next: string) => {
      setModeState(next);
      if (useDb) void setAutonomyMode(next).catch(() => { /* optimistic; revalidate reconciles */ });
    },
    [useDb],
  );

  const addRequest = useCallback(
    (data: Partial<DemoRequest> & { business: string; industry: string; city?: string }) => {
      setRequests((x) => [
        { ...data, id: 'rq' + Date.now(), t: 'just now', status: 'new', city: data.city || '—' } as DemoRequest,
        ...x,
      ]);
      if (useDb) void createDemoRequest(data).catch(() => { /* optimistic */ });
    },
    [useDb],
  );

  const addLead = useCallback(
    (r: { business: string; industry: string; city?: string; url?: string }) => {
      setLeads((x) =>
        x.find((l) => l.company === r.business)
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
      if (useDb) void createLead(r).catch(() => { /* optimistic */ });
    },
    [useDb],
  );

  const moveLead = useCallback(
    (leadId: string, stage: string) => {
      setLeads((x) => x.map((l) => (l.id === leadId ? { ...l, stage } : l)));
      if (useDb) void updateLeadStage(leadId, stage).catch(() => { /* optimistic */ });
    },
    [useDb],
  );

  const setRequestStatus = useCallback(
    (id: string, status: string) => {
      setRequests((x) => x.map((r) => (r.id === id ? { ...r, status } : r)));
      if (useDb) void updateRequestStatus(id, status).catch(() => { /* optimistic */ });
    },
    [useDb],
  );

  const convertRequest = useCallback(
    (id: string) => {
      setRequests((x) => x.map((r) => (r.id === id ? { ...r, status: 'converted' } : r)));
      // Optimistic local lead from the request (display only; the DB write is the action below).
      const req = requests.find((r) => r.id === id);
      if (req) {
        setLeads((ls) =>
          ls.find((l) => l.company === req.business)
            ? ls
            : [
                {
                  id: 'lead-' + Date.now(),
                  company: req.business,
                  industry: req.industry,
                  city: req.city || '—',
                  url: req.url || '(no site yet)',
                  site: 38,
                  score: 84,
                  value: 2400,
                  agent: 'vega',
                  stage: 'found',
                  demo: 'none',
                } satisfies Lead,
                ...ls,
              ],
        );
      }
      if (useDb) void convertRequestToLead(id).catch(() => { /* optimistic */ });
    },
    [useDb, requests],
  );

  const newReqCount = requests.filter((r) => r.status === 'new').length;
  const badges: Badges = {
    command: 3,
    requests: newReqCount || undefined,
  };

  return (
    <WorkspaceStateContext.Provider
      value={{ mode, setMode, requests, setRequests, addRequest, setRequestStatus, convertRequest, leads, setLeads, addLead, moveLead, useDb, badges }}
    >
      {children}
    </WorkspaceStateContext.Provider>
  );
}

export function useWorkspaceState(): WorkspaceStateContextValue {
  const ctx = useContext(WorkspaceStateContext);
  if (!ctx) throw new Error('useWorkspaceState must be used within <WorkspaceStateProvider>');
  return ctx;
}
