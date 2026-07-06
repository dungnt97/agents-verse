'use server';

import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { inngest } from '@/lib/inngest/client';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { deals } from '@/lib/db/schema';
import { MAX_REPLY_CHARS } from '@/lib/data/deal-stage-machine';

export interface IngestReplyResult {
  ok: boolean;
  message: string;
}

// Founder pastes a client's reply for a deal → hand it to the Closer (worker) to interpret and either
// auto-advance the deal or open an escalation. Web-side only: sends the Inngest event (the worker shells
// `claude`). Inbound email webhook is a later phase; founder-paste is the ingest path for now.
// Auth-guarded + degrades gracefully without a database.
export async function ingestReply(dealId: string, text: string): Promise<IngestReplyResult> {
  if (!USE_DB) return { ok: false, message: 'Reply handling requires the database (set USE_DB=true).' };
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  // Cap the pasted reply: bounds the Closer's token cost and keeps the Inngest event under its size limit.
  const body = text.trim().slice(0, MAX_REPLY_CHARS);
  if (!body) return { ok: false, message: 'Reply text is empty.' };

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return { ok: false, message: 'Deal not found.' };

  // Idempotency id = deal + content hash: an identical re-paste (accidental double-click or an
  // at-least-once redelivery) dedupes to one interpretation, while a genuinely different reply still
  // flows. Without it, a duplicate could double-advance the deal or re-open a resolved escalation.
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 16);
  await inngest.send({
    name: 'reply/received',
    data: { dealId, leadId: deal.leadId, text: body },
    id: `reply/received:${dealId}:${hash}`,
  });

  revalidatePath('/deals');
  revalidatePath('/command');
  return { ok: true, message: `Reply sent to the Closer for ${deal.client}.` };
}
