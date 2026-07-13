'use server';

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { demoRequests, leads, reqStatusEnum } from '@/lib/db/schema';
import { guardMutation, type MutationResult } from './guard';

type ReqStatus = (typeof reqStatusEnum.enumValues)[number];

export interface CreateDemoRequestInput {
  business: string;
  industry: string;
  city?: string;
  url?: string;
  name?: string;
  email?: string;
  message?: string;
}

// Persist an inbound demo request (public marketing form — no auth). Basic input validation
// only; spam/rate-limiting hardening is deferred to the outreach subsystem. Only invoked in
// DB mode.
// Clamp public free-text so a malicious/oversized submission can't bloat a row.
const clamp = (s: string | undefined, max: number) => (s?.trim() || '').slice(0, max);

export async function createDemoRequest(input: CreateDemoRequestInput): Promise<void> {
  // Degrade gracefully with no DB (the provider persists to localStorage in demo mode; this guard keeps a
  // stray call from throwing a raw connection error). The public form reaches this only in DB mode.
  if (!USE_DB) return;
  const business = clamp(input.business, 200);
  const industry = clamp(input.industry, 80);
  if (!business || !industry) throw new Error('business and industry are required');

  await db.insert(demoRequests).values({
    // Random id, not `Date.now()`: two concurrent public submissions in the same millisecond would
    // collide on the primary key and one would be lost.
    id: 'rq-' + randomUUID(),
    business,
    url: clamp(input.url, 300),
    industry,
    city: clamp(input.city, 120) || '—',
    name: clamp(input.name, 120),
    email: clamp(input.email, 200),
    message: clamp(input.message, 2000),
    t: 'just now',
    status: 'new',
  });

  revalidatePath('/requests');
  revalidatePath('/overview');
}

// Triage an inbound request (reviewing / contacted / declined / converted).
export async function updateRequestStatus(id: string, status: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  if (!reqStatusEnum.enumValues.includes(status as ReqStatus)) {
    return { ok: false, message: `invalid request status: ${status}` };
  }
  await db.update(demoRequests).set({ status: status as ReqStatus }).where(eq(demoRequests.id, id));
  revalidatePath('/requests');
  return { ok: true };
}

// Convert an inbound request into a pipeline lead (dedupe by company) and mark it converted.
export async function convertRequestToLead(id: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  const [req] = await db.select().from(demoRequests).where(eq(demoRequests.id, id)).limit(1);
  if (!req) return { ok: false, message: 'Request not found.' };

  // A demo INQUIRY already knows its exact lead (the one we sent the demo to). Don't dedupe-by-name or
  // create a duplicate — just mark it converted so the founder works the existing lead.
  if (req.leadId) {
    await db.update(demoRequests).set({ status: 'converted' }).where(eq(demoRequests.id, id));
    revalidatePath('/requests');
    revalidatePath('/leads');
    return { ok: true };
  }

  const existing = await db.select({ id: leads.id }).from(leads).where(eq(leads.company, req.business)).limit(1);
  if (existing.length === 0) {
    await db
      .insert(leads)
      .values({
        id: 'lead-' + randomUUID(),
        company: req.business,
        industry: req.industry,
        city: req.city,
        url: req.url || '(no site yet)',
        site: 38,
        score: 84,
        value: 2400,
        agent: 'vega',
        stage: 'found',
        demo: 'none',
      })
      .onConflictDoNothing();
  }
  await db.update(demoRequests).set({ status: 'converted' }).where(eq(demoRequests.id, id));
  revalidatePath('/requests');
  revalidatePath('/leads');
  return { ok: true };
}
