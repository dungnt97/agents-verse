/* =========================================================================
   AGENTS VERSE — Pure presentation helpers (client-safe).
   Constants + derivations with NO entity data and NO DB dependency, so both
   client components and the mock AV singleton import them from one place.
   Entity reads live in lib/repositories/* (server-only); these never do.
   ========================================================================= */
import type {
  Fmt,
  StatusMap,
  Stage,
  ScoreLabelEntry,
  DemoStatusMap,
  DealStageMap,
  ReqStatusMap,
} from './types';

export const fmt: Fmt = {
  money: (n) => '$' + n.toLocaleString('en-US'),
  money2: (n) => '$' + n.toFixed(2),
  k: (n) => (n >= 1000 ? '$' + (n / 1000).toFixed(1) + 'k' : '$' + n),
};

export const statusMap: StatusMap = {
  active: { label: 'Active', cls: 'badge-success', dot: 'var(--success)' },
  working: { label: 'Working', cls: 'badge-success', dot: 'var(--success)' },
  idle: { label: 'Idle', cls: 'badge-neutral', dot: 'var(--ink-3)' },
  waiting: { label: 'Waiting', cls: 'badge-info', dot: 'var(--info)' },
  warning: { label: 'Warning', cls: 'badge-warning', dot: 'var(--warning)' },
  review: { label: 'Needs review', cls: 'badge-warning', dot: 'var(--warning)' },
  escalate: { label: 'Escalating', cls: 'badge-danger', dot: 'var(--danger)' },
  paused: { label: 'Paused', cls: 'badge-neutral', dot: 'var(--ink-3)' },
};

export const stages: Stage[] = [
  { id: 'found', label: 'Found' },
  { id: 'audited', label: 'Audited' },
  { id: 'demo', label: 'Demo Generated' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'replied', label: 'Replied' },
  { id: 'won', label: 'Deal Won' },
];

export const SCORE_LABELS: ScoreLabelEntry[] = [
  ['visual', 'Visual design'], ['mobile', 'Mobile UX'], ['cta', 'CTA clarity'], ['trust', 'Trust signals'],
  ['seo', 'SEO basics'], ['speed', 'Speed impression'], ['content', 'Content quality'], ['conversion', 'Conversion potential'],
];

export const DEMO_STATUS: DemoStatusMap = {
  review: { label: 'Needs review', cls: 'badge-warning' },
  approved: { label: 'Approved', cls: 'badge-success' },
  sent: { label: 'Sent', cls: 'badge-info' },
  replied: { label: 'Client replied', cls: 'badge-violet' },
  won: { label: 'Won', cls: 'badge-success' },
  draft: { label: 'Generated', cls: 'badge-neutral' },
};

export const DEAL_STAGE: DealStageMap = {
  pricing: { label: 'Pricing question', cls: 'badge-info' },
  created: { label: 'Deal created', cls: 'badge-primary' },
  quoted: { label: 'Quote prepared', cls: 'badge-primary' },
  approval: { label: 'Approval required', cls: 'badge-warning' },
  call: { label: 'Human call requested', cls: 'badge-danger' },
  won: { label: 'Won', cls: 'badge-success' },
  lost: { label: 'Lost', cls: 'badge-neutral' },
};

export const REQ_STATUS: ReqStatusMap = {
  new: { label: 'New', cls: 'badge-warning' },
  reviewing: { label: 'Reviewing', cls: 'badge-info' },
  contacted: { label: 'Contacted', cls: 'badge-primary' },
  converted: { label: 'Converted', cls: 'badge-success' },
  declined: { label: 'Declined', cls: 'badge-neutral' },
};

const INDUSTRY_HUE: Record<string, number> = {
  Healthcare: 200, Wellness: 300, Hospitality: 140, 'Real Estate': 40, Logistics: 230, Fitness: 20,
};

export function hueFor(ind: string): number {
  return INDUSTRY_HUE[ind] || 220;
}
