import 'server-only';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { leads as leadsTable, audits as auditsTable, auditScreenshots } from '@/lib/db/schema';
import { AV, buildAuditFor } from '@/lib/data';
import type { Lead, AuditResult } from '@/lib/data/types';
import { USE_DB } from './config';

// Stages a lead must have reached to appear in audit/demo screens (mirrors auditedLeads()).
const AUDITED_STAGES = ['audited', 'demo', 'contacted', 'replied', 'won'] as const;

export async function getLeads(): Promise<Lead[]> {
  if (!USE_DB) return AV.leads;
  return db.select().from(leadsTable);
}

export async function auditedLeads(): Promise<Lead[]> {
  if (!USE_DB) return AV.auditedLeads();
  return db
    .select()
    .from(leadsTable)
    .where(inArray(leadsTable.stage, [...AUDITED_STAGES]));
}

// Lead joined with its stored audit. Falls back to the computed mock audit if a row is
// missing so a screen never crashes on an un-audited lead.
export async function getAudit(leadId: string): Promise<AuditResult> {
  if (!USE_DB) return AV.audit(leadId);
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId)).limit(1);
  const [a] = await db.select().from(auditsTable).where(eq(auditsTable.leadId, leadId)).limit(1);
  if (!lead) return AV.audit(leadId);
  // No stored audit (e.g. a discovery-sourced lead) → derive from THIS lead, not a mock placeholder.
  if (!a) return buildAuditFor(lead);
  return {
    ...lead,
    scores: a.scores,
    problems: a.problems,
    redesign: a.redesign,
    confidence: a.confidence,
    summary: a.summary,
  };
}

// The cached desktop screenshot (base64 PNG) of a lead's audited site, or null. Served by the
// /audit-shot/[leadId] route as the real "current website" preview.
export async function getAuditScreenshot(leadId: string): Promise<string | null> {
  if (!USE_DB) return null;
  const [row] = await db.select({ png: auditScreenshots.png }).from(auditScreenshots).where(eq(auditScreenshots.leadId, leadId)).limit(1);
  return row?.png ?? null;
}

// Upsert discovery-sourced leads keyed by the unique placeId — re-running discovery refreshes
// enrichment fields instead of duplicating. Returns the number of rows processed.
export async function upsertDiscoveredLeads(
  rows: (typeof leadsTable.$inferInsert)[],
): Promise<number> {
  if (rows.length === 0) return 0;
  await db
    .insert(leadsTable)
    .values(rows)
    .onConflictDoUpdate({
      target: leadsTable.placeId,
      set: {
        websiteUri: sql`excluded.website_uri`,
        email: sql`excluded.email`,
        phone: sql`excluded.phone`,
        site: sql`excluded.site`,
        websiteScore: sql`excluded.website_score`,
        formattedAddress: sql`excluded.formatted_address`,
        businessStatus: sql`excluded.business_status`,
      },
    });
  return rows.length;
}
