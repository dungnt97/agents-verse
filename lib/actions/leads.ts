'use server';

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { leads, leadStageEnum } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { guardMutation, type MutationResult } from './guard';

type LeadStage = (typeof leadStageEnum.enumValues)[number];

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
  if (!USE_DB) return; // degrade gracefully with no DB (provider handles demo mode via localStorage)
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
      id: 'lead-' + randomUUID(),
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

// Move a lead to a new pipeline stage (kanban drag / next-action button).
export async function updateLeadStage(leadId: string, stage: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  if (!leadStageEnum.enumValues.includes(stage as LeadStage)) {
    return { ok: false, message: `invalid lead stage: ${stage}` };
  }
  await db.update(leads).set({ stage: stage as LeadStage }).where(eq(leads.id, leadId));
  revalidatePath('/leads');
  revalidatePath('/overview');
  return { ok: true };
}
