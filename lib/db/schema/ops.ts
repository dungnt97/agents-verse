import { pgTable, text, integer, real, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { autonomyModeEnum, escalationStatusEnum } from './enums';

export const escalations = pgTable('escalations', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  sev: text('sev').notNull(),
  title: text('title').notNull(),
  who: text('who').notNull(),
  value: integer('value').notNull(),
  agent: text('agent').notNull(),
  reason: text('reason').notNull(),
  rec: text('rec').notNull(),
  conf: integer('conf').notNull(),
  // Relative time label kept for UI fidelity ('8 min ago').
  time: text('time').notNull(),
  // Resolution lifecycle (approve → resolved, dismiss → dismissed). Seeded rows default 'open'.
  status: escalationStatusEnum('status').notNull().default('open'),
  resolvedAt: timestamp('resolved_at'),
});

// ActivityItem has no natural key in the mock; the seed assigns a deterministic id
// (act-0..act-N) so re-seeding is idempotent. `seq` preserves the authored order.
export const activity = pgTable('activity', {
  id: text('id').primaryKey(),
  seq: integer('seq').notNull(),
  t: text('t').notNull(),
  agent: text('agent').notNull(),
  room: text('room').notNull(),
  type: text('type').notNull(),
  text: text('text').notNull(),
  status: text('status').notNull(),
});

// Single-row dashboard summary (AV.metrics). id is the constant 'current'.
export const metrics = pgTable('metrics', {
  id: text('id').primaryKey(),
  scanned: integer('scanned').notNull(),
  leads: integer('leads').notNull(),
  demos: integer('demos').notNull(),
  outreach: integer('outreach').notNull(),
  replies: integer('replies').notNull(),
  won: integer('won').notNull(),
  forecast: integer('forecast').notNull(),
  cost: real('cost').notNull(),
  costLimit: integer('cost_limit').notNull(),
  escalations: integer('escalations').notNull(),
  online: integer('online').notNull(),
  inProgress: integer('in_progress').notNull(),
  completed: integer('completed').notNull(),
  margin: integer('margin').notNull(),
  netProfit: integer('net_profit').notNull(),
});

// Founder control surface — single row 'default'. Guardrails/pricing kept as flexible
// jsonb (the Settings UI shape can evolve without a migration).
export const settings = pgTable('settings', {
  id: text('id').primaryKey(),
  autonomyMode: autonomyModeEnum('autonomy_mode').notNull().default('guarded'),
  guardrails: jsonb('guardrails').$type<Record<string, unknown>>(),
  pricing: jsonb('pricing').$type<Record<string, unknown>>(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
