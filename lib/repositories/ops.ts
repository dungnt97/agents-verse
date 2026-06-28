import 'server-only';
import { asc, desc, eq, gte, ne, count, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  escalations as escalationsTable,
  activity as activityTable,
  demoRequests as demoRequestsTable,
  settings as settingsTable,
  leads as leadsTable,
  deals as dealsTable,
  audits as auditsTable,
  generatedDemos as generatedDemosTable,
  agents as agentsTable,
  pipelineRuns as pipelineRunsTable,
} from '@/lib/db/schema';
import { AV } from '@/lib/data';
import type { Metrics, Escalation, ActivityItem, DemoRequest } from '@/lib/data/types';
import { computeCostMeter, DEFAULT_DAILY_CAP } from '@/lib/data/cost-meter';
import { ACTIVE_RUN_STATUSES } from '@/lib/inngest/pipeline-machine';
import { USE_DB } from './config';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Headline KPIs computed LIVE from the real tables (no static seeded row). Every number is a
// COUNT/SUM/derive over leads/audits/demos/deals/escalations/pipeline_runs at request time, so the
// dashboard reflects actual operation. Demo mode (no DB) still returns the mock AV snapshot.
export async function getMetrics(): Promise<Metrics> {
  if (!USE_DB) return AV.metrics;

  const today = startOfToday();
  const [
    [{ v: scanned }],
    [{ v: leadsN }],
    [{ v: demosReady }],
    [{ v: outreachSent }],
    [{ v: repliesN }],
    [{ v: wonN }],
    [{ v: forecastRaw }],
    [{ v: openEsc }],
    [{ v: agentsN }],
    [{ v: runsActive }],
    [{ v: runsDone }],
    [{ v: runsToday }],
    [settingsRow],
  ] = await Promise.all([
    db.select({ v: count() }).from(auditsTable),
    db.select({ v: count() }).from(leadsTable),
    db.select({ v: count() }).from(generatedDemosTable).where(eq(generatedDemosTable.status, 'ready')),
    db.select({ v: count() }).from(leadsTable).where(eq(leadsTable.demo, 'sent')),
    db.select({ v: count() }).from(leadsTable).where(eq(leadsTable.stage, 'replied')),
    db.select({ v: count() }).from(dealsTable).where(eq(dealsTable.stage, 'won')),
    db
      .select({ v: sql<number>`coalesce(sum(${dealsTable.value} * ${dealsTable.probability} / 100.0), 0)` })
      .from(dealsTable)
      .where(ne(dealsTable.stage, 'lost')),
    db.select({ v: count() }).from(escalationsTable).where(eq(escalationsTable.status, 'open')),
    db.select({ v: count() }).from(agentsTable),
    db.select({ v: count() }).from(pipelineRunsTable).where(inArray(pipelineRunsTable.status, [...ACTIVE_RUN_STATUSES])),
    db.select({ v: count() }).from(pipelineRunsTable).where(eq(pipelineRunsTable.status, 'done')),
    db.select({ v: count() }).from(pipelineRunsTable).where(gte(pipelineRunsTable.startedAt, today)),
    db.select().from(settingsTable).limit(1),
  ]);

  const guardrails = (settingsRow?.guardrails as Record<string, unknown> | null) ?? {};
  const meter = computeCostMeter(Number(runsToday), { costPerRun: guardrails.costPerRun, dailyCap: guardrails.dailyCostLimit });
  const costLimit = typeof guardrails.dailyCostLimit === 'number' ? guardrails.dailyCostLimit : DEFAULT_DAILY_CAP;

  const forecast = Math.round(Number(forecastRaw));
  const monthlyCost = Math.round(meter.estimatedCost * 30);
  const netProfit = forecast - monthlyCost;
  const margin = forecast > 0 ? Math.max(0, Math.round((netProfit / forecast) * 100)) : 0;

  // Live bottleneck: the department holding the most non-terminal leads (>=2). Replaces the old hardcoded
  // "Sales" badge — null when nothing is genuinely piling up, so the UI shows no false bottleneck.
  const STAGE_DEPT: Record<string, string> = {
    found: 'Lead Research',
    audited: 'Website Audit',
    demo: 'Design Studio',
    contacted: 'Sales',
    replied: 'Sales',
  };
  const stageCounts = await db
    .select({ stage: leadsTable.stage, v: count() })
    .from(leadsTable)
    .groupBy(leadsTable.stage);
  let bottleneck: string | null = null;
  let bMax = 1; // require at least 2 leads piled before calling it a bottleneck
  for (const r of stageCounts) {
    const dept = STAGE_DEPT[r.stage as string];
    if (dept && Number(r.v) > bMax) {
      bMax = Number(r.v);
      bottleneck = dept;
    }
  }

  return {
    scanned: Number(scanned),
    leads: Number(leadsN),
    demos: Number(demosReady),
    outreach: Number(outreachSent),
    replies: Number(repliesN),
    won: Number(wonN),
    forecast,
    cost: meter.estimatedCost,
    costLimit,
    escalations: Number(openEsc),
    online: Number(agentsN),
    inProgress: Number(runsActive),
    completed: Number(runsDone),
    margin,
    netProfit,
    bottleneck,
  };
}

export async function getEscalations(): Promise<Escalation[]> {
  if (!USE_DB) return AV.escalations;
  return db.select().from(escalationsTable).orderBy(asc(escalationsTable.id));
}

export async function getOpenEscalations(): Promise<Escalation[]> {
  if (!USE_DB) return AV.escalations;
  return db
    .select()
    .from(escalationsTable)
    .where(eq(escalationsTable.status, 'open'))
    .orderBy(asc(escalationsTable.id));
}

export async function getActivity(): Promise<ActivityItem[]> {
  if (!USE_DB) return AV.activity;
  return db.select().from(activityTable).orderBy(desc(activityTable.seq));
}

export async function getDemoRequests(): Promise<DemoRequest[]> {
  if (!USE_DB) return AV.demoRequests;
  return db.select().from(demoRequestsTable).orderBy(asc(demoRequestsTable.id));
}

export type WorkspaceSettings = typeof settingsTable.$inferSelect;

export async function getSettings(): Promise<WorkspaceSettings | null> {
  if (!USE_DB) return null;
  const [row] = await db.select().from(settingsTable).limit(1);
  return row ?? null;
}
