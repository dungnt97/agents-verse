import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// createDemoInquiry reaches next/cache (revalidatePath) and next/headers (client-ip for the rate limiter);
// neither exists under vitest, so stub them. A fixed IP is fine — the suite makes only a couple of calls,
// well under the per-client window.
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/headers', () => ({ headers: async () => ({ get: (k: string) => (k === 'x-real-ip' ? '203.0.113.42' : null) }) }));

import { db } from '@/lib/db/client';
import { leads, demoRequests } from '@/lib/db/schema';
import { createDemoInquiry } from '@/lib/actions/create-demo-inquiry';

const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('createDemoInquiry (public demo inquiry → /requests triage)', () => {
  let leadId = '';
  beforeAll(async () => {
    const [l] = await db.select().from(leads).orderBy(leads.id).limit(1);
    expect(l).toBeTruthy();
    leadId = l.id;
    await db.delete(demoRequests).where(eq(demoRequests.leadId, leadId));
  });
  afterAll(async () => {
    await db.delete(demoRequests).where(eq(demoRequests.leadId, leadId));
  });

  it('writes a demo_requests row linked to the lead, with the folded requirements/budget/timeline', async () => {
    const r = await createDemoInquiry(leadId, {
      name: 'Jane Prospect',
      contact: 'jane@example.com',
      requirements: 'Love it — can we add an online booking section?',
      budget: 'around $3k',
      timeline: 'next month',
    });
    expect(r.ok).toBe(true);

    const rows = await db.select().from(demoRequests).where(eq(demoRequests.leadId, leadId));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.leadId).toBe(leadId);
    expect(row.email).toBe('jane@example.com');
    expect(row.status).toBe('new');
    expect(row.message).toContain('online booking');
    expect(row.message).toContain('Budget: around $3k');
    expect(row.message).toContain('Timeline: next month');
    // business context is pulled from the lead, not the prospect — never blank.
    expect(row.business.length).toBeGreaterThan(0);
  });

  it('rejects an empty submission without writing a row', async () => {
    const r = await createDemoInquiry(leadId, { requirements: '   ', contact: '' });
    expect(r.ok).toBe(false);
    const rows = await db.select().from(demoRequests).where(eq(demoRequests.leadId, leadId));
    expect(rows).toHaveLength(1); // still just the one from the first test
  });
});
