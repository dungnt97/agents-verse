import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the db client BEFORE importing the module under test. We model the
// Drizzle insert chain: db.insert(table).values(row).onConflictDoNothing().
// `onConflictDoNothing` returns a thenable (the awaited value) so the
// `await` in recordActivity resolves. `valuesSpy` captures the built row.
// ---------------------------------------------------------------------------
const { onConflictDoNothing, valuesSpy, insertSpy, ACTIVITY_TABLE } = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn(() => Promise.resolve(undefined));
  const valuesSpy = vi.fn(() => ({ onConflictDoNothing }));
  const insertSpy = vi.fn(() => ({ values: valuesSpy }));
  return { onConflictDoNothing, valuesSpy, insertSpy, ACTIVITY_TABLE: { __table: 'activity' } };
});
vi.mock('@/lib/db/client', () => ({ db: { insert: (...args: unknown[]) => insertSpy(...args) } }));
vi.mock('@/lib/db/schema', () => ({ activity: ACTIVITY_TABLE }));

import { recordActivity } from '@/lib/inngest/activity-log';

describe('recordActivity', () => {
  beforeEach(() => {
    insertSpy.mockClear();
    valuesSpy.mockClear();
    onConflictDoNothing.mockClear();
    onConflictDoNothing.mockImplementation(() => Promise.resolve(undefined));
  });

  it('inserts a row into the activity table via the full drizzle chain', async () => {
    await recordActivity({
      agent: 'Atlas',
      room: 'strategy',
      type: 'demo-ready',
      text: 'Demo is ready',
    });

    expect(insertSpy).toHaveBeenCalledTimes(1);
    // insert() receives the activity table marker
    expect(insertSpy).toHaveBeenCalledWith(ACTIVITY_TABLE);
    expect(valuesSpy).toHaveBeenCalledTimes(1);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it('builds a row carrying type/agent/room/text and the expected derived fields', async () => {
    const before = Math.floor(Date.now() / 1000);
    await recordActivity({
      agent: 'Echo',
      room: 'outreach',
      type: 'outreach-sent',
      text: 'Email delivered',
    });
    const after = Math.floor(Date.now() / 1000);

    const row = valuesSpy.mock.calls[0][0] as Record<string, unknown>;

    expect(row.agent).toBe('Echo');
    expect(row.room).toBe('outreach');
    expect(row.type).toBe('outreach-sent');
    expect(row.text).toBe('Email delivered');
    expect(row.t).toBe('just now');

    // id embeds the event type and is prefixed `act-`
    expect(typeof row.id).toBe('string');
    expect(row.id as string).toMatch(/^act-outreach-sent-\d+-\d+$/);

    // seq is unix seconds, captured within the call window
    expect(typeof row.seq).toBe('number');
    expect(row.seq as number).toBeGreaterThanOrEqual(before);
    expect(row.seq as number).toBeLessThanOrEqual(after);
  });

  it('defaults status to "info" when none is provided', async () => {
    await recordActivity({
      agent: 'Atlas',
      room: 'strategy',
      type: 'audit-done',
      text: 'Audit complete',
    });

    const row = valuesSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(row.status).toBe('info');
  });

  it('uses the provided status when supplied', async () => {
    await recordActivity({
      agent: 'Closer',
      room: 'deals',
      type: 'deal-advanced',
      text: 'Deal moved forward',
      status: 'success',
    });

    const row = valuesSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(row.status).toBe('success');
  });

  it('swallows errors so a logging failure never breaks the run', async () => {
    onConflictDoNothing.mockImplementationOnce(() =>
      Promise.reject(new Error('db down')),
    );

    // must resolve (no throw) despite the rejected insert
    await expect(
      recordActivity({
        agent: 'Atlas',
        room: 'strategy',
        type: 'demo-ready',
        text: 'will fail to persist',
      }),
    ).resolves.toBeUndefined();
  });

  it('swallows synchronous throws from the insert chain', async () => {
    insertSpy.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    await expect(
      recordActivity({
        agent: 'Atlas',
        room: 'strategy',
        type: 'delivery-built',
        text: 'sync failure',
      }),
    ).resolves.toBeUndefined();
  });

  it('produces a fresh id on each call (random + timestamp suffix)', async () => {
    await recordActivity({ agent: 'a', room: 'r', type: 'x', text: 't1' });
    await recordActivity({ agent: 'a', room: 'r', type: 'x', text: 't2' });

    const id1 = (valuesSpy.mock.calls[0][0] as Record<string, unknown>).id as string;
    const id2 = (valuesSpy.mock.calls[1][0] as Record<string, unknown>).id as string;
    expect(id1).not.toBe(id2);
  });
});

// ---------------------------------------------------------------------------
// cookies.ts — client-side document.cookie helpers. In the node test env
// there is no `document` global by default, which exercises the SSR-guard
// branches. We stub a fake `document` to exercise the browser branches.
// ---------------------------------------------------------------------------
import { getCookie, setCookie } from '@/lib/cookies';

describe('cookies (SSR guard: no document)', () => {
  it('getCookie returns null when document is undefined', () => {
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined');
    expect(getCookie('theme')).toBeNull();
  });

  it('setCookie is a no-op when document is undefined', () => {
    expect(() => setCookie('theme', 'dark')).not.toThrow();
  });
});

describe('cookies (browser: document present)', () => {
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  function stubDocument(initialCookie = ''): { cookie: string } {
    const doc = { cookie: initialCookie };
    (globalThis as { document?: unknown }).document = doc;
    return doc;
  }

  it('getCookie reads and url-decodes a matching cookie value', () => {
    stubDocument('theme=dark; lang=vi; av-auth=tok%20en');
    expect(getCookie('theme')).toBe('dark');
    expect(getCookie('lang')).toBe('vi');
    // %20 decodes back to a space
    expect(getCookie('av-auth')).toBe('tok en');
  });

  it('getCookie matches a cookie that is first in the string', () => {
    stubDocument('first=1; second=2');
    expect(getCookie('first')).toBe('1');
  });

  it('getCookie returns null when the cookie is absent', () => {
    stubDocument('theme=dark');
    expect(getCookie('missing')).toBeNull();
  });

  it('getCookie returns null against an empty cookie string', () => {
    stubDocument('');
    expect(getCookie('theme')).toBeNull();
  });

  it('setCookie writes name=value with default max-age, path and SameSite', () => {
    const doc = stubDocument('');
    setCookie('theme', 'dark');
    const oneYear = 60 * 60 * 24 * 365;
    expect(doc.cookie).toBe(
      `theme=dark; path=/; max-age=${oneYear}; SameSite=Lax`,
    );
  });

  it('setCookie url-encodes the value', () => {
    const doc = stubDocument('');
    setCookie('av-auth', 'tok en');
    expect(doc.cookie).toContain('av-auth=tok%20en');
    expect(doc.cookie).toContain('SameSite=Lax');
  });

  it('setCookie honors a custom maxAgeSeconds', () => {
    const doc = stubDocument('');
    setCookie('lang', 'en', 120);
    expect(doc.cookie).toBe('lang=en; path=/; max-age=120; SameSite=Lax');
  });

  it('round-trips a value written by setCookie and read by getCookie', () => {
    // emulate a cookie jar: setCookie assigns the latest single pair, so seed
    // getCookie from what setCookie produced for the same key.
    const doc = stubDocument('');
    setCookie('theme', 'dark');
    // setCookie produces a single `name=value; ...attrs` string; getCookie's
    // regex stops at the first `;`, so reading it back yields the value.
    expect(getCookie('theme')).toBe('dark');
  });
});
