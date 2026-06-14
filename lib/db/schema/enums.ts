import { pgEnum } from 'drizzle-orm/pg-core';

// Postgres enum types for the pipeline state machines. Values are the EXACT literals
// the UI and mock data use — a mismatch fails inserts at runtime, so each set is a
// verified superset of every value present in lib/data/index.ts.
//
// Display/log fields (room.status, agent.status, escalation.kind/sev, activity.type/
// activity.status) stay plain text: the TS model types them as `string`, their value
// sets are broad and presentation-only, and a strict enum there would risk insert
// failures with no integrity payoff.

// Lead pipeline position. Data uses found/audited/demo/contacted/replied/won; `lost`
// included to mirror the deal lifecycle and keep the column forward-compatible.
export const leadStageEnum = pgEnum('lead_stage', [
  'found',
  'audited',
  'demo',
  'contacted',
  'replied',
  'won',
  'lost',
]);

// Demo state. `none` is required — the `north` lead carries demo:'none' (no demo yet),
// which the DEMO_STATUS map omits. Shared by leads.demo and demos.status (demos rows
// never use 'none' since they only exist for leads with a demo).
export const demoStatusEnum = pgEnum('demo_status', [
  'review',
  'approved',
  'sent',
  'replied',
  'won',
  'draft',
  'none',
]);

// Deal stage — mirrors DEAL_STAGE keys.
export const dealStageEnum = pgEnum('deal_stage', [
  'pricing',
  'created',
  'quoted',
  'approval',
  'call',
  'won',
  'lost',
]);

// Inbound demo-request triage — mirrors REQ_STATUS keys.
export const reqStatusEnum = pgEnum('req_status', [
  'new',
  'reviewing',
  'contacted',
  'converted',
  'declined',
]);

// Founder autonomy posture for the agent company (CEO control room / settings).
// Literals match the validated set the workspace provider accepts (default 'guarded').
export const autonomyModeEnum = pgEnum('autonomy_mode', [
  'manual',
  'review',
  'guarded',
  'full',
]);
