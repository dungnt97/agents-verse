'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inngest } from '@/lib/inngest/client';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { leads, generatedDemos } from '@/lib/db/schema';

export interface SendOutreachResult {
  ok: boolean;
  message: string;
}

// Queue outreach for a demo'd lead: Echo drafts the email and (per autonomy) sends it or parks it for
// founder approval. Web-side only — sends the Inngest event; the worker shells `claude` + calls Resend.
// Degrades gracefully: no DB, or no RESEND_API_KEY, returns a toast instead of doing anything (RESEND
// is the project's only new paid key). Auth-guarded.
export async function sendOutreach(leadId: string): Promise<SendOutreachResult> {
  if (!USE_DB) return { ok: false, message: 'Outreach requires the database (set USE_DB=true).' };
  // Match the worker's real requirement (RESEND_API_KEY + OUTREACH_FROM) so a half-configured setup
  // degrades here instead of queueing a send the worker can't complete.
  if (!process.env.RESEND_API_KEY || !process.env.OUTREACH_FROM) {
    return { ok: false, message: 'Email sending needs RESEND_API_KEY + OUTREACH_FROM (Resend free tier) — not configured.' };
  }
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, message: 'Lead not found.' };
  if (!lead.email) return { ok: false, message: `No email on file for ${lead.company}.` };

  const [demo] = await db.select().from(generatedDemos).where(eq(generatedDemos.leadId, leadId)).limit(1);
  if (!demo || demo.status !== 'ready') return { ok: false, message: 'Generate a demo for this lead first.' };

  await inngest.send({ name: 'outreach/requested', data: { leadId } });

  revalidatePath('/leads');
  revalidatePath('/overview');
  return { ok: true, message: `Outreach queued for ${lead.company}.` };
}
