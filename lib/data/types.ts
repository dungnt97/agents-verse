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
}
