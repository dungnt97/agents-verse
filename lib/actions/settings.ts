'use server';

import { revalidatePath } from 'next/cache';
import { USE_DB } from '@/lib/repositories/config';
import { db } from '@/lib/db/client';
import { settings, autonomyModeEnum } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { MARKET_CATALOG, MARKET_NICHES } from '@/lib/discovery/market-catalog';
import type { MarketPlan } from '@/lib/discovery/market-planner';
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

// Persist the founder's market-hunting pool (countries + niches + master switch) to the settings
// singleton. Validates against the catalog so a stale/tampered payload can never enable hunting on
// an out-of-catalog market, and refuses to enable an empty pool (the planner would have nothing to
// hunt — see planHasWork in market-planner.ts).
export async function updateMarketPlan(plan: MarketPlan): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;

  const validCodes = new Set(MARKET_CATALOG.map((c) => c.code));
  const countries = (plan.countries ?? []).filter((c) => validCodes.has(c));
  const niches = (plan.niches ?? []).filter((n) => MARKET_NICHES.includes(n));
  const enabled = !!plan.enabled;

  if (enabled && (countries.length === 0 || niches.length === 0)) {
    return { ok: false, message: 'Pick at least one country and one niche before turning hunting on.' };
  }

  const marketPlan: MarketPlan = { countries, niches, enabled };
  await db
    .insert(settings)
    .values({ id: 'default', marketPlan })
    .onConflictDoUpdate({ target: settings.id, set: { marketPlan, updatedAt: new Date() } });
  revalidatePath('/settings');
  return { ok: true };
}
