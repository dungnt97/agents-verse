import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

const sendMock = vi.hoisted(() => vi.fn(async (_e: { name?: string }) => {}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: sendMock } }));

import { db } from '@/lib/db/client';
import { leads, generatedDemos } from '@/lib/db/schema';
import { sendOutreach } from '@/lib/actions/send-outreach';

// Integration test for the outreach-queue action on a migrated + seeded Postgres. The headline contract
// is the KEY-GATED degrade: without RESEND_API_KEY the action must refuse cleanly (no event), and with
// it (+ a demo'd lead) it queues outreach/requested.
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('sendOutreach — USE_DB=true integration (seeded Postgres)', () => {
  let leadId = '';
  let prevEmail: string | null = null;
  const prevKey = process.env.RESEND_API_KEY;
  const prevFrom = process.env.OUTREACH_FROM;
  const setConfigured = () => {
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.OUTREACH_FROM = 'Agents Verse <hello@test.dev>';
  };

  beforeAll(async () => {
    // A lead that has a READY generated demo (so the outreach link is valid).
    const [demo] = await db.select().from(generatedDemos).where(eq(generatedDemos.status, 'ready')).limit(1);
    expect(demo).toBeTruthy();
    leadId = demo.leadId;
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
    prevEmail = lead.email;
    await db.update(leads).set({ email: 'owner@example.com' }).where(eq(leads.id, leadId));
  });

  afterAll(async () => {
    if (leadId) await db.update(leads).set({ email: prevEmail }).where(eq(leads.id, leadId));
    if (prevKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prevKey;
    if (prevFrom === undefined) delete process.env.OUTREACH_FROM; else process.env.OUTREACH_FROM = prevFrom;
  });

  it('degrades without email config — refuses and emits nothing', async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.OUTREACH_FROM;
    sendMock.mockClear();
    const res = await sendOutreach(leadId);
    expect(res.ok).toBe(false);
    expect(res.message).toContain('RESEND_API_KEY');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('degrades when only half-configured (key but no OUTREACH_FROM)', async () => {
    process.env.RESEND_API_KEY = 're_test_key';
    delete process.env.OUTREACH_FROM;
    sendMock.mockClear();
    const res = await sendOutreach(leadId);
    expect(res.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('with full email config + a demo’d lead, queues outreach/requested', async () => {
    setConfigured();
    sendMock.mockClear();
    const res = await sendOutreach(leadId);
    expect(res.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'outreach/requested', data: expect.objectContaining({ leadId }) }),
    );
  });

  it('refuses a lead with no email even when configured', async () => {
    setConfigured();
    sendMock.mockClear();
    await db.update(leads).set({ email: null }).where(eq(leads.id, leadId));
    const res = await sendOutreach(leadId);
    expect(res.ok).toBe(false);
    expect(res.message.toLowerCase()).toContain('no email');
    expect(sendMock).not.toHaveBeenCalled();
    await db.update(leads).set({ email: 'owner@example.com' }).where(eq(leads.id, leadId));
  });
});
