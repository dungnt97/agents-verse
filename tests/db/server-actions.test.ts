import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// These server actions reach into Next runtime APIs that don't exist under vitest:
//   - next/cache revalidatePath/revalidateTag are no-ops here.
//   - guard.ts / the auth-guarded actions call getCurrentUser() (Better Auth + next/headers);
//     stub a signed-in founder so guardMutation() and the inline auth checks pass under
//     USE_DB=true.
// Mocks are hoisted by vitest so they apply before the action modules import these deps.
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));

import { db } from '@/lib/db/client';
import { leads, demoRequests, settings } from '@/lib/db/schema';
import { createLead, updateLeadStage } from '@/lib/actions/leads';
import { createDemoRequest, updateRequestStatus, convertRequestToLead } from '@/lib/actions/requests';
import { setAutonomyMode, updateGuardrails, updatePricing, updateMarketPlan } from '@/lib/actions/settings';
import { updateDemoStatus } from '@/lib/actions/demos';

// Integration tests for the workspace server actions against the real USE_DB=true path on a
// migrated + seeded Postgres. Same skip contract as repositories.test.ts / deal-automation.test.ts:
// only run when DATABASE_URL is set AND USE_DB=true, so the default suite and Postgres-less envs
// are unaffected. Every mutation is snapshot+restored (seeded rows) or deleted (inserted
// fixtures) so the shared DB stays idempotent across runs.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

// Namespaced ids/companies for inserted fixtures so a crashed prior run can be cleaned on start.
const FIXTURE_LEAD_COMPANY = 'SA-Test Manual Lead Co';
const FIXTURE_REQ_ID = 'rq-sa-test';
const FIXTURE_CONVERT_REQ_ID = 'rq-sa-convert-test';
const FIXTURE_CONVERT_COMPANY = 'SA-Test Convert Co';

describe.skipIf(!hasDb)('workspace server actions — USE_DB=true integration (seeded Postgres)', () => {
  // --- leads.ts ---------------------------------------------------------------------------
  describe('leads.ts', () => {
    afterAll(async () => {
      await db.delete(leads).where(eq(leads.company, FIXTURE_LEAD_COMPANY));
    });

    it('createLead inserts a row discoverable by company (returns void → assert via DB)', async () => {
      await db.delete(leads).where(eq(leads.company, FIXTURE_LEAD_COMPANY)); // clean residue
      await createLead({
        business: FIXTURE_LEAD_COMPANY,
        industry: 'Testing',
        city: 'Testville',
        url: 'sa-test.example.com',
      });
      const [row] = await db.select().from(leads).where(eq(leads.company, FIXTURE_LEAD_COMPANY)).limit(1);
      expect(row).toBeTruthy();
      expect(row.industry).toBe('Testing');
      expect(row.city).toBe('Testville');
      expect(row.stage).toBe('audited'); // createLead's default shape
    });

    it('createLead dedupes by company (second call leaves a single row)', async () => {
      await createLead({ business: FIXTURE_LEAD_COMPANY, industry: 'Testing-2' });
      const rows = await db.select().from(leads).where(eq(leads.company, FIXTURE_LEAD_COMPANY));
      expect(rows.length).toBe(1);
      // Original row untouched — dedupe is a no-op, not an overwrite.
      expect(rows[0].industry).toBe('Testing');
    });

    it('updateLeadStage moves a seeded lead and persists (snapshot + restore)', async () => {
      const [seed] = await db.select().from(leads).orderBy(leads.id).limit(1);
      expect(seed).toBeTruthy();
      const original = seed.stage;
      // Pick a valid target distinct from the current stage.
      const target = original === 'won' ? 'contacted' : 'won';
      const res = await updateLeadStage(seed.id, target);
      expect(res).toEqual({ ok: true });
      const [after] = await db.select().from(leads).where(eq(leads.id, seed.id)).limit(1);
      expect(after.stage).toBe(target);
      // restore
      await db.update(leads).set({ stage: original }).where(eq(leads.id, seed.id));
    });

    it('updateLeadStage rejects an invalid stage without mutating the row', async () => {
      const [seed] = await db.select().from(leads).orderBy(leads.id).limit(1);
      const before = seed.stage;
      const res = await updateLeadStage(seed.id, 'not-a-real-stage');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('invalid lead stage');
      const [after] = await db.select().from(leads).where(eq(leads.id, seed.id)).limit(1);
      expect(after.stage).toBe(before); // unchanged
    });
  });

  // --- requests.ts ------------------------------------------------------------------------
  describe('requests.ts', () => {
    afterAll(async () => {
      await db.delete(demoRequests).where(eq(demoRequests.id, FIXTURE_REQ_ID));
      await db.delete(demoRequests).where(eq(demoRequests.id, FIXTURE_CONVERT_REQ_ID));
      // convertRequestToLead inserts a lead keyed by the request's business name.
      await db.delete(leads).where(eq(leads.company, FIXTURE_CONVERT_COMPANY));
    });

    it('createDemoRequest inserts an inbound request (returns void → assert via DB)', async () => {
      await db.delete(demoRequests).where(eq(demoRequests.id, FIXTURE_REQ_ID)); // clean residue
      // createDemoRequest generates its own id ('rq-' + Date.now()); to make the row findable
      // deterministically, insert our own fixture id first is not possible (no id input), so
      // assert on a unique business name instead.
      const uniqueBiz = 'SA-Test Inbound ' + FIXTURE_REQ_ID;
      await createDemoRequest({ business: uniqueBiz, industry: 'Inbound-Testing', city: 'Inboundville' });
      const [row] = await db
        .select()
        .from(demoRequests)
        .where(eq(demoRequests.business, uniqueBiz))
        .limit(1);
      expect(row).toBeTruthy();
      expect(row.industry).toBe('Inbound-Testing');
      expect(row.status).toBe('new');
      // delete by the generated id (business name is unique here)
      await db.delete(demoRequests).where(eq(demoRequests.business, uniqueBiz));
    });

    it('updateRequestStatus moves a seeded request and persists (snapshot + restore)', async () => {
      const [seed] = await db.select().from(demoRequests).orderBy(demoRequests.id).limit(1);
      expect(seed).toBeTruthy();
      const original = seed.status;
      const target = original === 'reviewing' ? 'contacted' : 'reviewing';
      const res = await updateRequestStatus(seed.id, target);
      expect(res).toEqual({ ok: true });
      const [after] = await db.select().from(demoRequests).where(eq(demoRequests.id, seed.id)).limit(1);
      expect(after.status).toBe(target);
      await db.update(demoRequests).set({ status: original }).where(eq(demoRequests.id, seed.id));
    });

    it('updateRequestStatus rejects an invalid status without mutating the row', async () => {
      const [seed] = await db.select().from(demoRequests).orderBy(demoRequests.id).limit(1);
      const before = seed.status;
      const res = await updateRequestStatus(seed.id, 'bogus-status');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('invalid request status');
      const [after] = await db.select().from(demoRequests).where(eq(demoRequests.id, seed.id)).limit(1);
      expect(after.status).toBe(before);
    });

    it('convertRequestToLead creates a lead from the request and marks it converted', async () => {
      // Use our own clean, never-converted fixture so the assertion is deterministic and
      // doesn't depend on (or mutate) seeded request states.
      await db.delete(demoRequests).where(eq(demoRequests.id, FIXTURE_CONVERT_REQ_ID));
      await db.delete(leads).where(eq(leads.company, FIXTURE_CONVERT_COMPANY));
      await db.insert(demoRequests).values({
        id: FIXTURE_CONVERT_REQ_ID,
        business: FIXTURE_CONVERT_COMPANY,
        url: 'sa-convert.example.com',
        industry: 'Convert-Testing',
        city: 'Convertville',
        name: 'SA Tester',
        email: 'sa@convert.test',
        message: 'convert me',
        t: 'just now',
        status: 'new',
      });

      const res = await convertRequestToLead(FIXTURE_CONVERT_REQ_ID);
      expect(res).toEqual({ ok: true });

      // A lead row was created from the request (company === request.business).
      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.company, FIXTURE_CONVERT_COMPANY))
        .limit(1);
      expect(lead).toBeTruthy();
      expect(lead.industry).toBe('Convert-Testing');
      expect(lead.city).toBe('Convertville');
      expect(lead.stage).toBe('found'); // convertRequestToLead's default shape

      // The request itself was marked converted.
      const [req] = await db
        .select()
        .from(demoRequests)
        .where(eq(demoRequests.id, FIXTURE_CONVERT_REQ_ID))
        .limit(1);
      expect(req.status).toBe('converted');

      // cleanup (also covered by afterAll, but keep this test self-contained)
      await db.delete(leads).where(eq(leads.company, FIXTURE_CONVERT_COMPANY));
      await db.delete(demoRequests).where(eq(demoRequests.id, FIXTURE_CONVERT_REQ_ID));
    });

    it('convertRequestToLead returns not-found for a missing request', async () => {
      const res = await convertRequestToLead('rq-does-not-exist-sa-test');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('not found');
    });
  });

  // --- settings.ts ------------------------------------------------------------------------
  describe('settings.ts', () => {
    let settingsId = 'default';
    let autonomySnapshot: string | null = null;
    let guardrailsSnapshot: Record<string, unknown> | null = null;
    let pricingSnapshot: Record<string, unknown> | null = null;
    let marketPlanSnapshot: typeof settings.$inferSelect.marketPlan = null;

    beforeAll(async () => {
      const [s] = await db.select().from(settings).limit(1);
      expect(s).toBeTruthy(); // seed must have created the settings singleton
      settingsId = s.id;
      autonomySnapshot = s.autonomyMode;
      guardrailsSnapshot = (s.guardrails as Record<string, unknown> | null) ?? null;
      pricingSnapshot = (s.pricing as Record<string, unknown> | null) ?? null;
      marketPlanSnapshot = s.marketPlan;
    });

    afterAll(async () => {
      await db
        .update(settings)
        .set({
          autonomyMode: (autonomySnapshot ?? 'guarded') as typeof settings.$inferInsert.autonomyMode,
          guardrails: guardrailsSnapshot,
          pricing: pricingSnapshot,
          marketPlan: marketPlanSnapshot,
        })
        .where(eq(settings.id, settingsId));
    });

    it('setAutonomyMode persists a valid mode (returns void → assert via DB)', async () => {
      const target = autonomySnapshot === 'full' ? 'manual' : 'full';
      await setAutonomyMode(target);
      const [s] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(s.autonomyMode).toBe(target);
    });

    it('setAutonomyMode throws on an invalid mode and leaves the value unchanged', async () => {
      const [before] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      await expect(setAutonomyMode('turbo')).rejects.toThrow(/invalid autonomy mode/);
      const [after] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(after.autonomyMode).toBe(before.autonomyMode);
    });

    it('updateGuardrails writes the guardrails jsonb', async () => {
      const marker = { autoApproveLimit: 4242, saMarker: 'guardrails-sa-test' };
      const res = await updateGuardrails(marker);
      expect(res).toEqual({ ok: true });
      const [s] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(s.guardrails).toMatchObject(marker);
    });

    it('updatePricing writes the pricing jsonb', async () => {
      const marker = { starter: 999, saMarker: 'pricing-sa-test' };
      const res = await updatePricing(marker);
      expect(res).toEqual({ ok: true });
      const [s] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(s.pricing).toMatchObject(marker);
    });

    it('updateMarketPlan persists a valid pool', async () => {
      const res = await updateMarketPlan({ countries: ['US', 'GB'], niches: ['nail salons', 'dental clinics'], enabled: true });
      expect(res).toEqual({ ok: true });
      const [s] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(s.marketPlan).toEqual({ countries: ['US', 'GB'], niches: ['nail salons', 'dental clinics'], enabled: true });
    });

    it('updateMarketPlan filters out an invalid country/niche before persisting', async () => {
      const res = await updateMarketPlan({
        countries: ['US', 'NOT-A-COUNTRY'],
        niches: ['nail salons', 'not-a-real-niche'],
        enabled: true,
      });
      expect(res).toEqual({ ok: true });
      const [s] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(s.marketPlan).toEqual({ countries: ['US'], niches: ['nail salons'], enabled: true });
    });

    it('updateMarketPlan rejects enabled-with-empty-pool without mutating the row', async () => {
      // Seed a known-good, disabled plan first so we can assert it's left untouched.
      await updateMarketPlan({ countries: ['US'], niches: ['nail salons'], enabled: false });
      const res = await updateMarketPlan({ countries: ['NOT-A-COUNTRY'], niches: ['not-a-real-niche'], enabled: true });
      expect(res.ok).toBe(false);
      expect(res.message).toBeTruthy();
      const [s] = await db.select().from(settings).where(eq(settings.id, settingsId)).limit(1);
      expect(s.marketPlan).toEqual({ countries: ['US'], niches: ['nail salons'], enabled: false });
    });
  });

  // --- demos.ts ---------------------------------------------------------------------------
  // updateDemoStatus is keyed by LEAD, not a demos-row id: the Demos screen derives each card's status
  // from leads.demo (joined with generated_demos), and under the production default SEED_DEMO_DATA=false the
  // legacy demos table is empty — writing it updated 0 rows and the founder's click did nothing. These tests
  // pin the corrected behavior (writes leads.demo) so the silent no-op can't return.
  describe('demos.ts', () => {
    let leadId = '';
    let demoSnapshot: typeof leads.$inferSelect.demo = 'none';

    beforeAll(async () => {
      const [l] = await db.select().from(leads).orderBy(leads.id).limit(1);
      expect(l).toBeTruthy(); // seed must have leads
      leadId = l.id;
      demoSnapshot = l.demo;
    });

    afterAll(async () => {
      if (leadId) await db.update(leads).set({ demo: demoSnapshot }).where(eq(leads.id, leadId));
    });

    it('updateDemoStatus writes leads.demo (the derived status), keyed by leadId', async () => {
      const target = demoSnapshot === 'sent' ? 'review' : 'sent';
      const res = await updateDemoStatus(leadId, target);
      expect(res).toEqual({ ok: true });
      const [l] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      expect(l.demo).toBe(target);
    });

    it('updateDemoStatus rejects an invalid status without mutating the lead', async () => {
      const [before] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      const res = await updateDemoStatus(leadId, 'not-a-status');
      expect(res.ok).toBe(false);
      expect(res.message).toContain('invalid demo status');
      const [after] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      expect(after.demo).toBe(before.demo);
    });
  });
});
