/* =========================================================================
   AGENTS VERSE — Domain model types
   Derived from the actual shape of data.js; single source of truth for
   all downstream consumers of the AV singleton.
   ========================================================================= */

export interface Room {
  id: string;
  name: string;
  short: string;
  purpose: string;
  status: string;
  agents: string[];
  active: number;
  running: number;
  done: number;
  health: number;
  mission: string;
  x: number;
  y: number;
  pos?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  room: string;
  status: string;
  conf: number;
  tasks: number;
  quality: number;
  cost: number;
  task: string;
  hue: number;
}

export interface Lead {
  id: string;
  company: string;
  industry: string;
  city: string;
  url: string;
  site: number;
  score: number;
  value: number;
  agent: string;
  stage: string;
  demo: string;
}

export interface Metrics {
  scanned: number;
  leads: number;
  demos: number;
  outreach: number;
  replies: number;
  won: number;
  forecast: number;
  cost: number;
  costLimit: number;
  escalations: number;
  online: number;
  inProgress: number;
  completed: number;
  margin: number;
  netProfit: number;
}

export interface Escalation {
  id: string;
  kind: string;
  sev: string;
  title: string;
  who: string;
  value: number;
  agent: string;
  reason: string;
  rec: string;
  conf: number;
  time: string;
  // Resolution lifecycle + optional deal link (DB mode); absent on legacy mock rows.
  status?: 'open' | 'resolved' | 'dismissed';
  dealId?: string | null;
}

export interface ActivityItem {
  t: string;
  agent: string;
  room: string;
  type: string;
  text: string;
  status: string;
}

export interface Stage {
  id: string;
  label: string;
}

export interface StatusMapEntry {
  label: string;
  cls: string;
  dot: string;
}

export type StatusMap = Record<string, StatusMapEntry>;

export interface Fmt {
  money: (n: number) => string;
  money2: (n: number) => string;
  k: (n: number) => string;
}

/* -------------------------------------------------------------------------
   data2.js entities — room/agent detail helpers
   ------------------------------------------------------------------------- */

export interface HistoryItem {
  t: string;
  event: string;
  status: string;
}

export interface OutputItem {
  title: string;
  meta: string;
  hue: number;
}

export interface AgentDetail extends Agent {
  purpose: string;
  skills: string[];
  tools: string[];
  history: HistoryItem[];
  outputs: OutputItem[];
  approval: number;
  maxTasks: number;
  escalationThreshold: number;
  chatPrompts: string[];
}

export interface RoomProject extends Lead {
  label: string;
  cls: string;
  progress: number;
  next: string;
}

export interface TimelineItem {
  t: string;
  // Optional: room timelines carry an agent; agent task-history items do not. The renderer
  // guards `e.agent &&`, so both shapes share this type and component.
  agent?: string | null;
  event: string;
  status: string;
}

// roomMetrics returns [label, value][] tuples
export type RoomMetrics = [string, string | number][][];

/* -------------------------------------------------------------------------
   data3.js entities — audits + demos
   ------------------------------------------------------------------------- */

export interface Redesign {
  style: string;
  sections: string[];
  cta: string;
  content: string;
  template: string;
}

export interface ScoreProfile {
  visual: number;
  mobile: number;
  cta: number;
  trust: number;
  seo: number;
  speed: number;
  content: number;
  conversion: number;
}

export interface DemoChecklist {
  'Responsive layout': boolean;
  'Clear primary CTA': boolean;
  'Strong hero section': boolean;
  'Trust elements': boolean;
  'Contact / booking form': boolean;
  'SEO basics': boolean;
  'Brand consistency': boolean;
}

export interface DemoOutreach {
  subject: string;
  body: string;
}

export interface Demo {
  id: string;
  leadId: string;
  business: string;
  industry: string;
  city: string;
  url: string;
  oldScore: number;
  newScore: number;
  status: string;
  statusLabel: string;
  statusCls: string;
  agents: string[];
  generated: string;
  demoUrl: string;
  clientStatus: string;
  value: number;
  changes: string[];
  notes: string;
  checklist: DemoChecklist;
  outreach: DemoOutreach;
}

export interface AuditResult extends Lead {
  scores: ScoreProfile;
  problems: string[];
  redesign: Redesign;
  confidence: number;
  summary: string;
}

export type ScoreLabelEntry = [string, string];

export interface DemoStatusEntry {
  label: string;
  cls: string;
}

export type DemoStatusMap = Record<string, DemoStatusEntry>;

/* -------------------------------------------------------------------------
   data4.js entities — deals + demo requests
   ------------------------------------------------------------------------- */

export interface DemoReply {
  kind: string;
  message: string;
  interpretation: string;
  suggested: string;
}

export interface ProductionAsset {
  name: string;
  got: boolean;
}

export interface ProductionStage {
  name: string;
  done?: boolean;
  current?: boolean;
}

export interface Production {
  phase: string;
  target: string;
  blocker: string;
  assets: ProductionAsset[];
  stages: ProductionStage[];
}

export interface Deal {
  id: string;
  leadId: string;
  client: string;
  industry: string;
  city: string;
  pkg: string;
  price: number;
  value: number;
  probability: number;
  stage: string;
  escReason: string | null;
  aiRec: string;
  conf: number;
  reply: DemoReply;
  production: Production | null;
}

export interface DealStageEntry {
  label: string;
  cls: string;
}

export type DealStageMap = Record<string, DealStageEntry>;

export interface DemoRequest {
  id: string;
  business: string;
  url: string;
  industry: string;
  city: string;
  name: string;
  email: string;
  message: string;
  t: string;
  status: string;
}

export interface ReqStatusEntry {
  label: string;
  cls: string;
}

export type ReqStatusMap = Record<string, ReqStatusEntry>;

/* -------------------------------------------------------------------------
   Extended AVData with data2/3/4 slices
   ------------------------------------------------------------------------- */

export interface AVData {
  rooms: Room[];
  agents: Agent[];
  leads: Lead[];
  metrics: Metrics;
  escalations: Escalation[];
  activity: ActivityItem[];
  stages: Stage[];
  statusMap: StatusMap;
  fmt: Fmt;
  agentById: (id: string) => Agent | undefined;
  roomById: (id: string) => Room | undefined;
  // data2 helpers
  agentDetail: (id: string) => AgentDetail | null;
  roomProjects: (roomId: string) => RoomProject[];
  roomTimeline: (roomId: string) => TimelineItem[];
  roomMetrics: (roomId: string) => [string, string | number][];
  // data3 helpers + constants
  SCORE_LABELS: ScoreLabelEntry[];
  DEMO_STATUS: DemoStatusMap;
  hueFor: (industry: string) => number;
  audit: (leadId: string) => AuditResult;
  auditedLeads: () => Lead[];
  demos: Demo[];
  demoByLead: (leadId: string) => Demo | undefined;
  // data4 helpers + constants
  DEAL_STAGE: DealStageMap;
  REQ_STATUS: ReqStatusMap;
  deals: Deal[];
  demoRequests: DemoRequest[];
  dealByLead: (id: string) => Deal | undefined;
}
