/* =========================================================================
   AGENTS VERSE — Route metadata map (port of ROUTE_META from app.jsx)
   Maps each workspace route id to its display label, icon, and description.
   Used by breadcrumbs, ComingSoon, and CommandPalette.
   ========================================================================= */

export interface RouteMeta {
  label: string;
  icon?: string;
  desc?: string;
}

export const ROUTE_META: Record<string, RouteMeta> = {
  overview: { label: 'Overview' },
  command:  { label: 'Command Center' },
  rooms:    { label: 'Rooms',    icon: 'rooms',    desc: 'Scan every department at a glance — status, active agents, output and health — then drill into any room to inspect and control it.' },
  agents:   { label: 'Agents',   icon: 'agents',   desc: 'The full AI workforce: each agent’s role, room, live task, confidence, quality and cost — with controls to pause, reassign or coach.' },
  leads:    { label: 'Leads',    icon: 'leads',    desc: 'A demo-first pipeline from Found → Audited → Demo → Contacted → Replied → Won, with drag-to-move stages and per-lead actions.' },
  audits:   { label: 'Audits',   icon: 'audits',   desc: 'Professional website audit reports — scores across design, mobile, trust and conversion, with detected problems and a suggested redesign direction.' },
  demos:    { label: 'Demos',    icon: 'demos',    desc: 'Manage AI-generated website demos: before/after previews, quality checklist, approval status, shareable links and outreach drafts.' },
  deals:    { label: 'Deals',    icon: 'deals',    desc: 'Quotes, approvals and the post-reply deal flow — package, price, probability and the human-call escalation path.' },
  activity: { label: 'Activity', icon: 'activity', desc: 'The full system timeline: every lead found, demo generated, message sent, reply handled and escalation triggered across the company.' },
  settings: { label: 'Settings', icon: 'settings', desc: 'Automation rules and guardrails — autonomy mode, pricing thresholds, outreach limits, escalation rules and AI cost budgets.' },
  requests: { label: 'Demo requests', icon: 'send' },
};
