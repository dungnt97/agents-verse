import 'server-only';
import { db } from '@/lib/db/client';
import { auditJobs } from '@/lib/db/schema';
import { USE_DB } from './config';

// Web-side reads of audit job lifecycle (the audit screen shows queued/running/failed state).
// Writes happen in the Inngest worker (lib/inngest/functions/run-audit.ts), NOT here — the
// worker runs under tsx where this module's `server-only` import would throw.
export type AuditJob = typeof auditJobs.$inferSelect;

export async function getAuditJobs(): Promise<Record<string, AuditJob>> {
  if (!USE_DB) return {};
  const rows = await db.select().from(auditJobs);
  return Object.fromEntries(rows.map((r) => [r.leadId, r]));
}
