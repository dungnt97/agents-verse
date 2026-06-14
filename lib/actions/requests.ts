'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { demoRequests } from '@/lib/db/schema';

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
  const business = clamp(input.business, 200);
  const industry = clamp(input.industry, 80);
  if (!business || !industry) throw new Error('business and industry are required');

  await db.insert(demoRequests).values({
    id: 'rq-' + Date.now(),
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
