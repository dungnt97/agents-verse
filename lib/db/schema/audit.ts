import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { leads } from './leads';

// Lifecycle of an async audit job (Inngest), one row per lead. Kept SEPARATE from the `audits`
// result table — `audits` stays NOT NULL and is written only when an audit completes, so the
// audit screen can keep rendering full results. This table drives the job-state UI
// (queued / running / done / failed + error).
export const auditStatusEnum = pgEnum('audit_status', ['queued', 'running', 'done', 'failed']);

export const auditJobs = pgTable('audit_jobs', {
  leadId: text('lead_id')
    .primaryKey()
    .references(() => leads.id, { onDelete: 'cascade' }),
  status: auditStatusEnum('status').notNull().default('queued'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
