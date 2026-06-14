import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';

import { AV } from '@/lib/data';
import { getLeads, auditedLeads, getAudit, upsertDiscoveredLeads } from '@/lib/repositories/leads';
import { getRooms } from '@/lib/repositories/rooms';
import { getAgents } from '@/lib/repositories/agents';
import { getDemos, getDeals } from '@/lib/repositories/pipeline';
import {
  getMetrics,
  getEscalations,
  getActivity,
  getDemoRequests,
  getSettings,
} from '@/lib/repositories/ops';
import { db } from '@/lib/db/client';
import { leads as leadsTable, metrics as metricsTable } from '@/lib/db/schema';

// Integration tests for the real USE_DB=true repository path against a migrated + seeded
// Postgres. Skipped unless DATABASE_URL is set AND USE_DB=true, so the default `npm run test`
// suite and Postgres-less environments are unaffected. CI runs a postgres:17 service +
// db:migrate + db:seed before `npm run test:db`; locally: `docker compose up -d db` (or any
// Postgres) + db:migrate + db:seed.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

const sortedIds = (rows: ReadonlyArray<{ id: string }>): string[] => rows.map((r) => r.id).sort();

describe.skipIf(!hasDb)('repositories — USE_DB=true integration (seeded Postgres)', () => {
  // The seed ports the mock AV singleton into Postgres, so the DB read path must return the
  // SAME entity set as the mock fallback — this is the core dual-mode contract.
  describe('reads return the same entity set as the mock AV singleton', () => {
    it('getLeads ⇔ AV.leads', async () => {
      expect(sortedIds(await getLeads())).toEqual(sortedIds(AV.leads));
    });

    it('auditedLeads ⇔ AV.auditedLeads() and is stage-filtered', async () => {
      const rows = await auditedLeads();
      expect(sortedIds(rows)).toEqual(sortedIds(AV.auditedLeads()));
      const allowed = new Set(['audited', 'demo', 'contacted', 'replied', 'won']);
      expect(rows.every((l) => allowed.has(l.stage))).toBe(true);
    });

    it('getRooms ⇔ AV.rooms', async () => {
      expect(sortedIds(await getRooms())).toEqual(sortedIds(AV.rooms));
    });

    it('getAgents ⇔ AV.agents', async () => {
      expect(sortedIds(await getAgents())).toEqual(sortedIds(AV.agents));
    });

    it('getDemos ⇔ AV.demos', async () => {
      expect(sortedIds(await getDemos())).toEqual(sortedIds(AV.demos));
    });

    it('getDeals ⇔ AV.deals', async () => {
      expect(sortedIds(await getDeals())).toEqual(sortedIds(AV.deals));
    });

    it('getEscalations ⇔ AV.escalations', async () => {
      expect(sortedIds(await getEscalations())).toEqual(sortedIds(AV.escalations));
    });

    it('getDemoRequests ⇔ AV.demoRequests', async () => {
      expect(sortedIds(await getDemoRequests())).toEqual(sortedIds(AV.demoRequests));
    });
  });

  it('getActivity returns the seeded activity feed in seq order', async () => {
    const rows = await getActivity();
    expect(rows.length).toBe(AV.activity.length);
    // getActivity orders by asc(seq) = insertion order = AV order; verify ordering, not just count.
    expect(rows[0].text).toBe(AV.activity[0].text);
    expect(rows[rows.length - 1].text).toBe(AV.activity[AV.activity.length - 1].text);
  });

  it('getMetrics reads the seeded metrics row (not the mock fallback)', async () => {
    // getMetrics() returns `row ?? AV.metrics`, so a function-level value check can't tell a real
    // row from the fallback. Query the table directly to prove the seed actually wrote the row.
    const [row] = await db.select().from(metricsTable);
    expect(row).toBeTruthy();
    expect(row.scanned).toBe(AV.metrics.scanned);
    // And the repo still returns well-formed numeric KPIs.
    const m = await getMetrics();
    for (const k of ['scanned', 'leads', 'demos', 'won', 'cost'] as const) {
      expect(typeof m[k]).toBe('number');
    }
  });

  it('getSettings returns a real settings row in DB mode (mock fallback returns null)', async () => {
    const s = await getSettings();
    expect(s).not.toBeNull();
    expect(typeof s!.autonomyMode).toBe('string');
  });

  describe('getAudit', () => {
    const DIMS = ['visual', 'mobile', 'cta', 'trust', 'seo', 'speed', 'content', 'conversion'] as const;

    it('returns a well-formed AuditResult for an audited lead', async () => {
      const [lead] = await auditedLeads();
      expect(lead).toBeTruthy();
      const a = await getAudit(lead.id);
      for (const d of DIMS) expect(typeof a.scores[d]).toBe('number');
      expect(Array.isArray(a.problems)).toBe(true);
      expect(a.redesign).toBeTruthy();
      expect(typeof a.confidence).toBe('number');
      expect(typeof a.summary).toBe('string');
    });

    it('falls back to a derived/mock audit for an unknown lead id (never crashes)', async () => {
      const a = await getAudit('nonexistent-lead-zzz');
      expect(a).toBeTruthy();
      expect(a.scores).toBeTruthy();
    });
  });

  describe('upsertDiscoveredLeads (write path)', () => {
    const placeId = 'place-integration-test-0001';
    const baseRow: typeof leadsTable.$inferInsert = {
      id: placeId,
      company: 'Integration Test Clinic',
      industry: 'Testing',
      city: 'CI City',
      url: 'https://integration-test.example',
      site: 30,
      score: 80,
      value: 1000,
      agent: 'vega',
      stage: 'audited',
      demo: 'draft',
      placeId,
      email: 'before@integration-test.example',
    };

    // Keep the suite idempotent on a persistent local DB (CI uses a throwaway service):
    // clear any residue from a crashed prior run before inserting, and clean up after.
    beforeAll(async () => {
      await db.delete(leadsTable).where(eq(leadsTable.placeId, placeId));
    });
    afterAll(async () => {
      await db.delete(leadsTable).where(eq(leadsTable.placeId, placeId));
    });

    it('inserts a discovered lead, then upserts by placeId without duplicating', async () => {
      const inserted = await upsertDiscoveredLeads([baseRow]);
      expect(inserted).toBe(1);

      let rows = await db.select().from(leadsTable).where(eq(leadsTable.placeId, placeId));
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe('before@integration-test.example');

      // Same placeId, changed email → updates in place, no duplicate row.
      await upsertDiscoveredLeads([{ ...baseRow, email: 'after@integration-test.example' }]);
      rows = await db.select().from(leadsTable).where(eq(leadsTable.placeId, placeId));
      expect(rows).toHaveLength(1);
      expect(rows[0].email).toBe('after@integration-test.example');
    });
  });
});
