'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { leads } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';

export interface CreateLeadInput {
  business: string;
  industry: string;
  city?: string;
  url?: string;
}

// Persist a manually-added lead. Derives the same default lead shape the prototype used
// (mirrors the client addLead defaults) and dedupes by company name, since there is no DB
// unique constraint on company. Only invoked in DB mode.
export async function createLead(input: CreateLeadInput): Promise<void> {
  // Authenticated-only — middleware only checks cookie existence, so the action must verify.
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const company = input.business?.trim();
  const industry = input.industry?.trim();
  if (!company || !industry) throw new Error('business and industry are required');

  const existing = await db.select({ id: leads.id }).from(leads).where(eq(leads.company, company)).limit(1);
  if (existing.length > 0) return;

  await db
    .insert(leads)
    .values({
      id: 'lead-' + Date.now(),
      company,
      industry,
      city: input.city?.trim() || '—',
      url: input.url?.trim() || '(no site yet)',
      site: 38,
      score: 84,
      value: 2400,
      agent: 'vega',
      stage: 'audited',
      demo: 'draft',
    })
    .onConflictDoNothing();

  revalidatePath('/leads');
  revalidatePath('/overview');
}
