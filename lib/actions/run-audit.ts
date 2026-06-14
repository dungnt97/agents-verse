'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inngest } from '@/lib/inngest/client';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { auditJobs, leads } from '@/lib/db/schema';

export interface RunAuditResult {
  ok: boolean;
  message: string;
}

// Queue a durable audit for a lead. Web-side only: sends the Inngest event (the worker runs the
// actual PageSpeed/Playwright/Gemini pipeline). Importing the inngest CLIENT (not the function)
// keeps playwright/gemini out of the web bundle. Auth-guarded + degrades gracefully without DB.
export async function requestAudit(leadId: string): Promise<RunAuditResult> {
  if (!USE_DB) {
    return { ok: false, message: 'Audit requires the database (set USE_DB=true).' };
  }
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, message: 'Lead not found.' };

  // Mark queued right away so the UI reflects state before the worker picks it up.
  await db
    .insert(auditJobs)
    .values({ leadId, status: 'queued' })
    .onConflictDoUpdate({
      target: auditJobs.leadId,
      set: { status: 'queued', error: null, startedAt: null, finishedAt: null, updatedAt: new Date() },
    });

  await inngest.send({ name: 'audit/requested', data: { leadId } });

  revalidatePath('/audits');
  return { ok: true, message: `Audit queued for ${lead.company}.` };
}
