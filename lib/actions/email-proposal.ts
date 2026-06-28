'use server';

import { eq } from 'drizzle-orm';
import { inngest } from '@/lib/inngest/client';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { deals, leads } from '@/lib/db/schema';

export interface EmailProposalResult {
  ok: boolean;
  message: string;
}

// Queue the proposal email for a deal: the worker renders the PDF + sends it via Resend with the PDF
// attached. Web-side only (sends the Inngest event); founder-triggered = the approval gate. Degrades to
// a toast when DB or Resend isn't configured. Auth-guarded (it spends the only paid key).
export async function emailProposal(dealId: string): Promise<EmailProposalResult> {
  if (!USE_DB) return { ok: false, message: 'Proposal email requires the database (set USE_DB=true).' };
  if (!process.env.RESEND_API_KEY || !process.env.OUTREACH_FROM) {
    return { ok: false, message: 'Email sending needs RESEND_API_KEY + OUTREACH_FROM (Resend) — not configured.' };
  }
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { ok: false, message: 'Deal not found.' };
  const [lead] = await db.select().from(leads).where(eq(leads.id, deal.leadId)).limit(1);
  if (!lead?.email) return { ok: false, message: `No client email on file for ${deal.client}.` };

  await inngest.send({ name: 'proposal/requested', data: { dealId } });
  return { ok: true, message: `Proposal email queued for ${deal.client}.` };
}
