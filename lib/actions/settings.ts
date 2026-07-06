'use server';

import { revalidatePath } from 'next/cache';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { settings, autonomyModeEnum } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { guardMutation, type MutationResult } from './guard';

type AutonomyMode = (typeof autonomyModeEnum.enumValues)[number];

// Persist the founder autonomy mode to the settings singleton (id 'default'). Upsert so the
// row is created if seeding hasn't run. Degrades to a no-op with no DB (demo mode uses localStorage).
export async function setAutonomyMode(mode: string): Promise<void> {
  if (!USE_DB) return;
  if (!(await getCurrentUser())) throw new Error('Unauthorized');
  if (!autonomyModeEnum.enumValues.includes(mode as AutonomyMode)) {
    throw new Error('invalid autonomy mode: ' + mode);
  }
  const value = mode as AutonomyMode;

  await db
    .insert(settings)
    .values({ id: 'default', autonomyMode: value })
    .onConflictDoUpdate({
      target: settings.id,
      set: { autonomyMode: value, updatedAt: new Date() },
    });

  revalidatePath('/settings');
}

// Persist founder guardrails (auto-approve limit, daily cost cap, …) to the settings singleton.
export async function updateGuardrails(guardrails: Record<string, unknown>): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  await db
    .insert(settings)
    .values({ id: 'default', guardrails })
    .onConflictDoUpdate({ target: settings.id, set: { guardrails, updatedAt: new Date() } });
  revalidatePath('/settings');
  return { ok: true };
}

// Persist founder pricing (package prices) to the settings singleton.
export async function updatePricing(pricing: Record<string, unknown>): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  await db
    .insert(settings)
    .values({ id: 'default', pricing })
    .onConflictDoUpdate({ target: settings.id, set: { pricing, updatedAt: new Date() } });
  revalidatePath('/settings');
  return { ok: true };
}
