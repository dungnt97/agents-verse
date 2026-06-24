import { describe, it, expect, beforeAll, vi } from 'vitest';

// ingestReply reaches Next + Better Auth + the Inngest client. Stub them; capture inngest.send.
const sendMock = vi.hoisted(() => vi.fn(async (_event: { id?: string; name?: string }) => {}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: async () => ({ id: 'founder', email: 'founder@agentsverse.ai' }),
}));
vi.mock('@/lib/inngest/client', () => ({ inngest: { send: sendMock } }));

import { db } from '@/lib/db/client';
import { deals } from '@/lib/db/schema';
import { ingestReply } from '@/lib/actions/ingest-reply';

// Integration test for the founder-paste reply ingest on a migrated + seeded Postgres. Same skip
// contract as the other db suites (DATABASE_URL + USE_DB=true).
const hasDb = !!process.env.DATABASE_URL && process.env.USE_DB === 'true';

describe.skipIf(!hasDb)('ingestReply — USE_DB=true integration (seeded Postgres)', () => {
  let dealId = '';
  let leadId = '';

  beforeAll(async () => {
    const [deal] = await db.select().from(deals).orderBy(deals.id).limit(1);
    expect(deal).toBeTruthy(); // seed must have run
    dealId = deal.id;
    leadId = deal.leadId;
  });

  it('sends a reply/received event for the deal', async () => {
    sendMock.mockClear();
    const res = await ingestReply(dealId, '  OK em, giá bao nhiêu vậy?  ');
    expect(res.ok).toBe(true);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'reply/received',
        // Content-hash idempotency id: an identical re-paste dedupes to one interpretation.
        id: expect.stringMatching(new RegExp(`^reply/received:${dealId}:[0-9a-f]{16}$`)),
        data: expect.objectContaining({ dealId, leadId, text: 'OK em, giá bao nhiêu vậy?' }),
      }),
    );
  });

  it('the same trimmed reply produces a stable dedup id; a different reply does not', async () => {
    sendMock.mockClear();
    await ingestReply(dealId, 'Giá nhiêu vậy em?');
    await ingestReply(dealId, '  Giá nhiêu vậy em?  '); // same after trim → same id
    await ingestReply(dealId, 'Đắt quá để anh nghĩ thêm'); // different → different id
    const ids = sendMock.mock.calls.map((c) => c[0].id);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  it('rejects empty reply text and emits nothing', async () => {
    sendMock.mockClear();
    const res = await ingestReply(dealId, '   ');
    expect(res.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown deal', async () => {
    sendMock.mockClear();
    const res = await ingestReply('no-such-deal', 'hello');
    expect(res.ok).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
