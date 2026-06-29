import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { demoStatusEnum, dealStageEnum } from './enums';
import { leads } from './leads';
import type {
  ScoreProfile,
  Redesign,
  DemoChecklist,
  DemoOutreach,
  DemoReply,
  Production,
} from '@/lib/data/types';

// Audit result for a lead. AuditResult = Lead + these fields; the repository joins this
// row with the lead, so only the audit-specific columns live here (keyed by leadId).
export const audits = pgTable('audits', {
  leadId: text('lead_id')
    .primaryKey()
    .references(() => leads.id, { onDelete: 'cascade' }),
  scores: jsonb('scores').$type<ScoreProfile>().notNull(),
  problems: jsonb('problems').$type<string[]>().notNull(),
  redesign: jsonb('redesign').$type<Redesign>().notNull(),
  confidence: integer('confidence').notNull(),
  summary: text('summary').notNull(),
});

// Cached homepage screenshot (desktop, base64 PNG) of the audited site — shown as the real "current
// website" preview. Kept in its own table so the large image never bloats the audits row / its columns.
export const auditScreenshots = pgTable('audit_screenshots', {
  leadId: text('lead_id')
    .primaryKey()
    .references(() => leads.id, { onDelete: 'cascade' }),
  png: text('png').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const demos = pgTable('demos', {
  id: text('id').primaryKey(),
  leadId: text('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  business: text('business').notNull(),
  industry: text('industry').notNull(),
  city: text('city').notNull(),
  url: text('url').notNull(),
  oldScore: integer('old_score').notNull(),
  newScore: integer('new_score').notNull(),
  status: demoStatusEnum('status').notNull(),
  statusLabel: text('status_label').notNull(),
  statusCls: text('status_cls').notNull(),
  agents: jsonb('agents').$type<string[]>().notNull(),
  generated: text('generated').notNull(),
  demoUrl: text('demo_url').notNull(),
  clientStatus: text('client_status').notNull(),
  value: integer('value').notNull(),
  changes: jsonb('changes').$type<string[]>().notNull(),
  notes: text('notes').notNull(),
  checklist: jsonb('checklist').$type<DemoChecklist>().notNull(),
  outreach: jsonb('outreach').$type<DemoOutreach>().notNull(),
});

// AI-generated redesign demo for an audited lead. Kept separate from the rich `demos` table (which
// models the mock review/outreach workflow) so generation only owns the HTML + its job status.
// Keyed by leadId: one current generated demo per lead, re-running overwrites it.
export const generatedDemos = pgTable('generated_demos', {
  leadId: text('lead_id')
    .primaryKey()
    .references(() => leads.id, { onDelete: 'cascade' }),
  html: text('html'), // null until the first successful generation
  status: text('status').notNull(), // 'generating' | 'ready' | 'failed'
  error: text('error'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deals = pgTable('deals', {
  id: text('id').primaryKey(),
  leadId: text('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  client: text('client').notNull(),
  industry: text('industry').notNull(),
  city: text('city').notNull(),
  pkg: text('pkg').notNull(),
  price: integer('price').notNull(),
  value: integer('value').notNull(),
  probability: integer('probability').notNull(),
  stage: dealStageEnum('stage').notNull(),
  escReason: text('esc_reason'),
  aiRec: text('ai_rec').notNull(),
  conf: integer('conf').notNull(),
  reply: jsonb('reply').$type<DemoReply>().notNull(),
  production: jsonb('production').$type<Production | null>(),
});
