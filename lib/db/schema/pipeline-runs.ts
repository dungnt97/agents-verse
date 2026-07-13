import { pgTable, text, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { autonomyModeEnum } from './enums';
import { leads } from './leads';
import { ACTIVE_RUN_STATUSES } from '../../inngest/pipeline-machine';

// Funnel position a run currently occupies. Forward-compatible superset of the whole agency pipeline
// (Discovery → Audit → Demo → Outreach → Sales-reply → Deal → Delivery). The orchestrator drives
// `audit` → `demo` → `outreach`, and `outreach` is the run's closing stage; `reply`, `deal` and
// `delivery` are reserved — the post-sale work runs off deal events, decoupled from pipeline_runs —
// so those subsystems can be wired into the run machine later without a new enum/migration.
export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'audit',
  'demo',
  'outreach',
  'reply',
  'deal',
  'delivery',
]);

// Run lifecycle. `running` = an agent is working or the next hop is queued; `waiting_approval` =
// parked at a founder gate; `paused` = halted by the kill switch; `done`/`failed` are terminal.
// The active set {running, waiting_approval, paused} is exactly what the partial-unique index keys on.
export const pipelineRunStatusEnum = pgEnum('pipeline_run_status', [
  'running',
  'waiting_approval',
  'paused',
  'done',
  'failed',
]);

// One job ticket per pipeline run for a lead — the spine that lets the central orchestrator know
// where a lead is, decide the next hop, and anchor idempotency. Keyed by a generated id (not leadId)
// so a lead can accumulate many finished runs; the partial-unique index below enforces at most ONE
// active run per lead, so a concurrent/duplicate start is a no-op.
export const pipelineRuns = pgTable(
  'pipeline_runs',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    stage: pipelineStageEnum('stage').notNull().default('audit'),
    status: pipelineRunStatusEnum('status').notNull().default('running'),
    // Autonomy posture captured when the run started — kept for the record only; LIVE hop decisions
    // read the current settings so a founder toggle takes effect mid-run.
    autonomySnapshot: autonomyModeEnum('autonomy_snapshot').notNull(),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // At most one in-flight run per lead. This is the arbiter for start-pipeline's
    // ON CONFLICT DO NOTHING: a second start while one is active inserts nothing. The predicate is
    // derived from ACTIVE_RUN_STATUSES (the machine's single source of truth) so the index can't
    // silently drift from it — sql.raw inlines the literals to match the generated DDL exactly.
    uniqueIndex('pipeline_runs_active_lead_idx')
      .on(t.leadId)
      .where(sql`${t.status} in ${sql.raw(`(${ACTIVE_RUN_STATUSES.map((s) => `'${s}'`).join(', ')})`)}`),
  ],
);
