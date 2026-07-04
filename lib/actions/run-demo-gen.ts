'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inngest } from '@/lib/inngest/client';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { leads, audits, generatedDemos } from '@/lib/db/schema';

export interface RunDemoGenResult {
  ok: boolean;
  message: string;
}

// Queue durable demo generation for an audited lead. Web-side only: sends the Inngest event; the
// worker runs the actual `claude` CLI generation (kept out of the web bundle). Auth-guarded +
// degrades gracefully without DB. Requires an existing audit — that is the redesign brief.
export async function requestDemoGeneration(leadId: string): Promise<RunDemoGenResult> {
  if (!USE_DB) {
    return { ok: false, message: 'Demo generation requires the database (set USE_DB=true).' };
  }
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, message: 'Lead not found.' };
  const [audit] = await db.select().from(audits).where(eq(audits.leadId, leadId)).limit(1);
  if (!audit) return { ok: false, message: 'Run an audit first — the demo is built from it.' };

  // Double-click guard: `demo/requested` carries no dedup id (a lead may legitimately be re-generated
  // later), so a rapid second click would queue a SECOND full ~20-32 min opus run behind the per-lead
  // serialization. A fresh 'generating' row means one is already queued/running; the staleness window
  // (> the worst-case run) lets a run that died without a status write be re-requested.
  const GENERATING_FRESH_MS = 45 * 60 * 1000;
  const [existing] = await db.select().from(generatedDemos).where(eq(generatedDemos.leadId, leadId)).limit(1);
  if (
    existing?.status === 'generating' &&
    existing.updatedAt &&
    Date.now() - existing.updatedAt.getTime() < GENERATING_FRESH_MS
  ) {
    return { ok: false, message: `A demo for ${lead.company} is already generating.` };
  }

  // Mark generating right away so the UI reflects state before the worker picks it up.
  await db
    .insert(generatedDemos)
    .values({ leadId, status: 'generating', error: null, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: generatedDemos.leadId,
      set: { status: 'generating', error: null, updatedAt: new Date() },
    });

  await inngest.send({ name: 'demo/requested', data: { leadId } });

  revalidatePath('/audits');
  return { ok: true, message: `Generating demo for ${lead.company}…` };
}
