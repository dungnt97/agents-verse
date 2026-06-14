import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq, inArray, isNotNull } from 'drizzle-orm';

// Same Next-runtime shims as the other DB-mode suites:
//   - next/cache revalidatePath/revalidateTag are no-ops under vitest.
//   - guard.ts calls getCurrentUser() (Better Auth + next/headers); stub a signed-in founder so
//     guardMutation() passes the auth check when USE_DB=true.
// Hoisted by vitest so they apply before the action modules import these deps.
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));

import { db } from '@/lib/db/client';
import { deals, leads, auditJobs } from '@/lib/db/schema';
import { setProductionStage, toggleProductionAsset } from '@/lib/actions/deals';
import { getAuditJobs } from '@/lib/repositories/audit-jobs';
import type { Production } from '@/lib/data/types';

// Same skip contract as the other DB-mode suites: only run when DATABASE_URL is set AND
// USE_DB=true, so the default suite and Postgres-less envs are unaffected.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('production actions + audit-jobs repo — USE_DB=true integration (seeded Postgres)', () => {
  // ---- Production actions (setProductionStage / toggleProductionAsset) ----
  // Pick a seeded deal that actually HAS a production timeline (most seeded deals have
  // production:null). Deterministic by id so the same deal is exercised every run; snapshot its
  // production jsonb and restore it after to keep the shared DB idempotent.
  let prodDealId = '';
  let prodSnapshot: Production | null = null;

  async function getProd(): Promise<Production | null> {
    const [row] = await db.select().from(deals).where(eq(deals.id, prodDealId)).limit(1);
    return row?.production ?? null;
  }

  beforeAll(async () => {
    const [row] = await db
      .select()
      .from(deals)
      .where(isNotNull(deals.production))
      .orderBy(deals.id)
      .limit(1);
    expect(row).toBeTruthy(); // seed must include a deal with a production timeline
    expect(row.production).toBeTruthy();
    prodDealId = row.id;
    // Deep clone so the snapshot is decoupled from later mutations of the live row object.
    prodSnapshot = JSON.parse(JSON.stringify(row.production)) as Production;
    // Sanity: the timeline must be non-trivial for the boundary/recompute assertions to mean
    // something (need at least one stage and one asset).
    expect(prodSnapshot.stages.length).toBeGreaterThan(0);
    expect(prodSnapshot.assets.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (prodDealId) {
      await db.update(deals).set({ production: prodSnapshot }).where(eq(deals.id, prodDealId));
    }
  });

  it('1. setProductionStage(k) recomputes done/current per the timeline rule', async () => {
    const n = prodSnapshot!.stages.length;
    // Use an interior index when possible so we can assert BOTH the done-prefix and the
    // single advanced "current"; if there's only one stage, k=0 still exercises the rule.
    const k = n >= 2 ? n - 2 : 0;
    const res = await setProductionStage(prodDealId, k);
    expect(res).toEqual({ ok: true });

    const prod = await getProd();
    expect(prod).not.toBeNull();
    const stages = prod!.stages;
    expect(stages.length).toBe(n); // recompute must not add/drop stages
    stages.forEach((s, i) => {
      // done for every index <= k, not-done after; exactly k+1 is current, all others not.
      expect(s.done).toBe(i <= k);
      expect(s.current).toBe(i === k + 1);
    });
    // Stage names are preserved (only done/current are recomputed).
    expect(stages.map((s) => s.name)).toEqual(prodSnapshot!.stages.map((s) => s.name));
  });

  it('2. setProductionStage on the LAST index completes the timeline (no current)', async () => {
    const last = prodSnapshot!.stages.length - 1;
    const res = await setProductionStage(prodDealId, last);
    expect(res).toEqual({ ok: true });

    const stages = (await getProd())!.stages;
    // Every stage done, and current === last+1 is out of range so nothing is current.
    expect(stages.every((s) => s.done === true)).toBe(true);
    expect(stages.some((s) => s.current === true)).toBe(false);
  });

  it('3. setProductionStage rejects out-of-range indices and leaves production unchanged', async () => {
    // Drive a known good state first, then prove the invalid calls are no-ops.
    await setProductionStage(prodDealId, 0);
    const before = JSON.stringify(await getProd());

    const neg = await setProductionStage(prodDealId, -1);
    expect(neg.ok).toBe(false);

    const over = await setProductionStage(prodDealId, prodSnapshot!.stages.length);
    expect(over.ok).toBe(false);

    expect(JSON.stringify(await getProd())).toBe(before); // unchanged by either invalid call
  });

  it('4. toggleProductionAsset flips one asset; calling twice returns to original', async () => {
    const j = 0;
    const original = (await getProd())!.assets[j].got;

    const r1 = await toggleProductionAsset(prodDealId, j);
    expect(r1).toEqual({ ok: true });
    expect((await getProd())!.assets[j].got).toBe(!original);

    const r2 = await toggleProductionAsset(prodDealId, j);
    expect(r2).toEqual({ ok: true });
    expect((await getProd())!.assets[j].got).toBe(original);
  });

  it('5. toggleProductionAsset only touches the target asset', async () => {
    const prod = await getProd();
    if (prod!.assets.length < 2) return; // nothing to compare against on a single-asset timeline
    const others = prod!.assets.filter((_, i) => i !== 1).map((a) => a.got);

    await toggleProductionAsset(prodDealId, 1);
    const after = await getProd();
    const othersAfter = after!.assets.filter((_, i) => i !== 1).map((a) => a.got);
    expect(othersAfter).toEqual(others); // siblings untouched

    await toggleProductionAsset(prodDealId, 1); // restore
  });

  it('6. toggleProductionAsset rejects out-of-range indices and leaves production unchanged', async () => {
    const before = JSON.stringify(await getProd());

    const neg = await toggleProductionAsset(prodDealId, -1);
    expect(neg.ok).toBe(false);

    const over = await toggleProductionAsset(prodDealId, prodSnapshot!.assets.length);
    expect(over.ok).toBe(false);

    expect(JSON.stringify(await getProd())).toBe(before);
  });

  // ---- getAuditJobs repository ----
  // audit_jobs.leadId is the PRIMARY KEY (one row per lead) with an FK to leads.id, so we must
  // reference REAL seeded lead ids. Pick two deterministically, insert a row for each, then assert
  // getAuditJobs() returns a map keyed by leadId carrying our rows + statuses. Delete after.
  let auditLeadIds: string[] = [];

  beforeAll(async () => {
    const rows = await db.select({ id: leads.id }).from(leads).orderBy(leads.id).limit(2);
    expect(rows.length).toBeGreaterThan(0); // seed must include leads
    auditLeadIds = rows.map((r) => r.id);
    // Clear any residue from a crashed prior run on a persistent local DB.
    await db.delete(auditJobs).where(inArray(auditJobs.leadId, auditLeadIds));
  });

  afterAll(async () => {
    if (auditLeadIds.length) {
      await db.delete(auditJobs).where(inArray(auditJobs.leadId, auditLeadIds));
    }
  });

  it('7. getAuditJobs returns a map keyed by leadId with the inserted rows + statuses', async () => {
    const [leadA, leadB] = auditLeadIds;
    await db.insert(auditJobs).values({ leadId: leadA, status: 'running' });
    if (leadB) {
      await db.insert(auditJobs).values({ leadId: leadB, status: 'failed', error: 'boom' });
    }

    const map = await getAuditJobs();
    expect(map[leadA]).toBeTruthy();
    expect(map[leadA].leadId).toBe(leadA);
    expect(map[leadA].status).toBe('running');
    if (leadB) {
      expect(map[leadB]).toBeTruthy();
      expect(map[leadB].status).toBe('failed');
      expect(map[leadB].error).toBe('boom');
    }
  });

  it('8. getAuditJobs defaults status to "queued" when unspecified', async () => {
    const [leadA] = auditLeadIds;
    // Replace the row from the previous test with one that omits status → schema default applies.
    await db.delete(auditJobs).where(eq(auditJobs.leadId, leadA));
    await db.insert(auditJobs).values({ leadId: leadA });

    const map = await getAuditJobs();
    expect(map[leadA]).toBeTruthy();
    expect(map[leadA].status).toBe('queued');
  });
});
