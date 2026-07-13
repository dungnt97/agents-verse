'use server';

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { demoRequests, leads } from '@/lib/db/schema';
import { slidingWindowLimiter } from '@/lib/integrations/chat-rate-limit';
import type { MutationResult } from './guard';

// A prospect responding to the demo we sent them, from the public /inquire/[leadId] page. UNAUTHENTICATED,
// so: rate-limited per client + globally, every field clamped, and it degrades cleanly with no DB. Writes a
// `demo_requests` row (status 'new') linked to the lead so it lands in the founder's /requests triage — it
// does NOT create a deal (a founder decision: review first, then work with the client).

export interface DemoInquiryInput {
  name?: string;
  contact?: string; // email or phone the prospect leaves
  requirements?: string; // what they want changed / added
  budget?: string; // free-text, from the light qualification — never a number we quote
  timeline?: string;
}

// Public submit guard, mirroring /api/chat: a per-client window plus a coarse global spend/abuse ceiling.
const perClient = slidingWindowLimiter(Number(process.env.INQUIRY_PER_CLIENT_MAX) || 5, 10 * 60_000);
const globalCap = slidingWindowLimiter(Number(process.env.INQUIRY_GLOBAL_MAX) || 120, 10 * 60_000);

const clamp = (s: string | undefined, max: number): string => (s?.trim() || '').slice(0, max);

// TRUSTED client key: X-Real-IP (proxy-set) first, else the LAST X-Forwarded-For hop (the one our own
// fronting proxy appends) — never the first, client-supplied hop.
async function clientKey(): Promise<string> {
  const h = await headers();
  const realIp = h.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const hops = (h.get('x-forwarded-for') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return hops.length ? hops[hops.length - 1] : 'local';
}

export async function createDemoInquiry(leadId: string, input: DemoInquiryInput): Promise<MutationResult> {
  const now = Date.now();
  // Record a hit on BOTH limiters so global accounting stays accurate even when the per-client check passes.
  const over = [perClient(await clientKey(), now), globalCap('inquiry', now)];
  if (over[0] || over[1]) return { ok: false, message: 'Too many submissions — please try again in a few minutes.' };

  const requirements = clamp(input.requirements, 2000);
  const contact = clamp(input.contact, 200);
  if (!requirements && !contact) return { ok: false, message: 'Please tell us what you need or leave a contact.' };

  // Demo mode (no DB) — accept it so the public page still confirms; there is nowhere to persist it.
  if (!USE_DB) return { ok: true, message: 'Thanks — we will be in touch.' };

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return { ok: false, message: 'This demo link is no longer valid.' };

  // Fold the free-text into one message so the founder reads it whole in /requests; omit empty parts (never
  // invent a value the prospect did not give).
  const message = [
    requirements && `Requirements: ${requirements}`,
    clamp(input.budget, 200) && `Budget: ${clamp(input.budget, 200)}`,
    clamp(input.timeline, 200) && `Timeline: ${clamp(input.timeline, 200)}`,
  ]
    .filter(Boolean)
    .join('\n') || 'Inquiry from the demo page (no details given).';

  await db.insert(demoRequests).values({
    id: 'rq-' + randomUUID(),
    business: lead.company,
    url: lead.url,
    industry: lead.industry,
    city: lead.city || '—',
    name: clamp(input.name, 120),
    email: contact,
    message,
    leadId: lead.id,
    t: 'just now',
    status: 'new',
  });

  revalidatePath('/requests');
  revalidatePath('/overview');
  return { ok: true, message: 'Thanks — we will be in touch.' };
}
