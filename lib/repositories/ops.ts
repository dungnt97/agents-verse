import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  metrics as metricsTable,
  escalations as escalationsTable,
  activity as activityTable,
  demoRequests as demoRequestsTable,
  settings as settingsTable,
} from '@/lib/db/schema';
import { AV } from '@/lib/data';
import type { Metrics, Escalation, ActivityItem, DemoRequest } from '@/lib/data/types';
import { USE_DB } from './config';

export async function getMetrics(): Promise<Metrics> {
  if (!USE_DB) return AV.metrics;
  const [row] = await db.select().from(metricsTable).limit(1);
  return row ?? AV.metrics;
}

export async function getEscalations(): Promise<Escalation[]> {
  if (!USE_DB) return AV.escalations;
  // Stable order (e1, e2, e3…) so DB-mode render order is deterministic.
  return db.select().from(escalationsTable).orderBy(asc(escalationsTable.id));
}

// Open (unresolved) escalations only — drives the ReviewCenter panel. Mock mode has no
// resolution lifecycle, so all mock escalations are treated as open.
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
  // seq preserves the authored ordering the UI expects (newest first).
  return db.select().from(activityTable).orderBy(asc(activityTable.seq));
}

export async function getDemoRequests(): Promise<DemoRequest[]> {
  if (!USE_DB) return AV.demoRequests;
  return db.select().from(demoRequestsTable).orderBy(asc(demoRequestsTable.id));
}

export type WorkspaceSettings = typeof settingsTable.$inferSelect;

// Founder settings singleton (row id 'default'). No mock equivalent — the prototype kept
// autonomy mode in localStorage; Phase 6 wires writes. Returns null in mock mode.
export async function getSettings(): Promise<WorkspaceSettings | null> {
  if (!USE_DB) return null;
  const [row] = await db.select().from(settingsTable).limit(1);
  return row ?? null;
}
