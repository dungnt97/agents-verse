import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  escAttr, fallbackMeta, localBusinessJsonLd, injectSeo, sitemapXml, robotsTxt,
} from '@/lib/agents/pipelines/delivery-seo';
import { closerSales } from '@/lib/agents/defs/closer-sales';
import { verifyResendSignature, extractEmailAddress } from '@/lib/integrations/resend-inbound';

describe('delivery-seo: every branch', () => {
  it('escAttr escapes all five special characters', () => {
    expect(escAttr('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e');
  });

  it('fallbackMeta uses the summary when present and a derived default when blank', () => {
    const withSummary = fallbackMeta('Atlas', 'dentistry', 'Houston', 'Real audit summary.');
    expect(withSummary.description).toContain('Real audit summary.');
    const blank = fallbackMeta('Atlas', 'dentistry', 'Houston', '');
    expect(blank.description).toContain('mobile-first dentistry');
    // keywords drop falsy entries (empty company).
    expect(fallbackMeta('', 'spa', 'Hue', '').keywords).toEqual(['spa', 'Hue']);
  });

  it('localBusinessJsonLd includes url only when provided', () => {
    expect(localBusinessJsonLd('A', 'spa', 'Hue', 'https://a.test')).toContain('https://a.test');
    expect(localBusinessJsonLd('A', 'spa', 'Hue', '')).not.toContain('"url"');
    // `<` is neutralised so the JSON can't break out of a <script>.
    expect(localBusinessJsonLd('A<x', 'spa', 'Hue', '')).not.toContain('<');
  });

  it('injectSeo: replaces into an existing <head>', () => {
    const meta = fallbackMeta('A', 'spa', 'Hue', 's');
    const out = injectSeo('<html><head><title>Old</title></head><body>x</body></html>', meta, '{}', 'https://a.test/');
    expect(out).toContain('<title>A — spa in Hue</title>');
    expect(out).not.toContain('<title>Old</title>');
    expect(out).toContain('rel="canonical"');
  });

  it('injectSeo: synthesises a <head> when the document has <html> but no head', () => {
    const meta = fallbackMeta('A', 'spa', 'Hue', 's');
    const out = injectSeo('<html><body>x</body></html>', meta, '{}', '');
    expect(out).toContain('<head>');
    expect(out).toContain('<title>A — spa in Hue</title>');
    // no canonical link when canonical is empty
    expect(out).not.toContain('rel="canonical"');
  });

  it('injectSeo: wraps a bare fragment that has neither <head> nor <html>', () => {
    const meta = fallbackMeta('A', 'spa', 'Hue', 's');
    const out = injectSeo('<body>x</body>', meta, '{}', 'https://a.test/');
    expect(out.startsWith('<head>')).toBe(true);
    expect(out).toContain('<body>x</body>');
  });

  it('sitemapXml + robotsTxt with and without a canonical', () => {
    expect(sitemapXml('https://a.test/')).toContain('<loc>https://a.test/</loc>');
    expect(robotsTxt('https://a.test/')).toContain('Sitemap: https://a.test/sitemap.xml');
    expect(robotsTxt('')).not.toContain('Sitemap:');
  });
});

describe('closer-sales: terminal deal (empty legal next stages)', () => {
  it('renders the "(none — deal is terminal)" fallback when no next stages are legal', () => {
    const p = closerSales.buildPrompt({
      deal: { client: 'X', industry: 'spa', city: 'Hue', pkg: 'Premium', value: 1000, stage: 'won' },
      legalNextStages: [],
      text: 'thanks',
    });
    expect(p).toContain('(none — deal is terminal)');
  });
});

describe('resend-inbound: signature verification + email extraction', () => {
  const secretRaw = 'supersecretkeybytes!!';
  const secret = 'whsec_' + Buffer.from(secretRaw).toString('base64');
  const id = 'msg_1', timestamp = '1700000000', payload = '{"a":1}';
  const sign = () => 'v1,' + createHmac('sha256', Buffer.from(secretRaw)).update(`${id}.${timestamp}.${payload}`).digest('base64');

  it('returns true for a correctly signed payload (incl. a rotation list)', () => {
    expect(verifyResendSignature({ secret, id, timestamp, signature: sign(), payload })).toBe(true);
    expect(verifyResendSignature({ secret, id, timestamp, signature: `v1,bad ${sign()}`, payload })).toBe(true);
  });

  it('returns false for missing fields, empty key, wrong version, and a bad signature', () => {
    expect(verifyResendSignature({ secret, id: '', timestamp, signature: sign(), payload })).toBe(false);
    expect(verifyResendSignature({ secret: 'whsec_', id, timestamp, signature: sign(), payload })).toBe(false);
    expect(verifyResendSignature({ secret, id, timestamp, signature: 'v2,' + 'x', payload })).toBe(false);
    expect(verifyResendSignature({ secret, id, timestamp, signature: 'v1,', payload })).toBe(false);
    expect(verifyResendSignature({ secret, id, timestamp, signature: sign(), payload: 'tampered' })).toBe(false);
  });

  it('extractEmailAddress handles angle-bracket, plain, object, and invalid inputs', () => {
    expect(extractEmailAddress('Atlas <ops@atlas.test>')).toBe('ops@atlas.test');
    expect(extractEmailAddress('PLAIN@X.TEST')).toBe('plain@x.test');
    expect(extractEmailAddress('not-an-email')).toBeNull();
    expect(extractEmailAddress({ name: 'A', address: 'a@b.test' })).toBe('a@b.test');
    expect(extractEmailAddress({ name: 'A' })).toBeNull();
    expect(extractEmailAddress(42)).toBeNull();
  });
});

import { vi, beforeEach, afterEach } from 'vitest';
import { assessWebsite } from '@/lib/discovery/bad-website-heuristic';
import { nextStages, isTerminalStage, canTransition, type DealStage } from '@/lib/data/deal-stage-machine';

describe('deal-stage-machine: defensive lookups on an unknown stage', () => {
  it('falls back safely when given a non-existent stage', () => {
    const bogus = 'nope' as DealStage;
    expect(nextStages(bogus)).toEqual([]);
    expect(isTerminalStage(bogus)).toBe(true);
    expect(canTransition(bogus, 'won')).toBe(false);
  });
});

describe('bad-website-heuristic: assessWebsite (fetch mocked)', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  function mockFetch(opts: { ok?: boolean; html?: string; url?: string; reject?: boolean }) {
    global.fetch = vi.fn().mockImplementation(() =>
      opts.reject
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ ok: opts.ok ?? true, url: opts.url ?? 'https://x.test', text: () => Promise.resolve(opts.html ?? '') }),
    ) as unknown as typeof fetch;
  }

  it('marks an unreachable site (non-ok response)', async () => {
    mockFetch({ ok: false });
    expect(await assessWebsite('x.test')).toMatchObject({ reachable: false, score: 25, flags: ['unreachable'] });
  });

  it('marks an unreachable site (fetch throws)', async () => {
    mockFetch({ reject: true });
    expect(await assessWebsite('https://x.test')).toMatchObject({ reachable: false, flags: ['unreachable'] });
  });

  it('a modern, rich page earns a high score with no flags', async () => {
    const year = new Date().getFullYear();
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head><body>' +
      'Book your appointment today. © ' + year + ' Co. ' + 'x'.repeat(2000) + '</body></html>';
    mockFetch({ html, url: 'https://x.test' });
    const r = await assessWebsite('x.test');
    expect(r.reachable).toBe(true);
    expect(r.flags).toEqual([]);
    expect(r.score).toBe(72);
  });

  it('a weak, stale page accumulates every flag', async () => {
    const html = '<table><tr><td><table><tr><td>old</td></tr></table></td></tr></table> copyright 2016';
    // The SSRF-guarded fetch derives the final URL from the request (not the mock's `url`), so drive the
    // http scheme via the input to exercise the no-https flag.
    mockFetch({ html });
    const r = await assessWebsite('http://x.test');
    expect(r.reachable).toBe(true);
    expect(r.flags).toEqual(expect.arrayContaining(['no-https', 'no-viewport', 'no-clear-cta', 'stale-copyright', 'thin-content', 'table-layout']));
    expect(r.score).toBe(12); // floored
  });

  it('a recent copyright year is NOT flagged as stale', async () => {
    const year = new Date().getFullYear();
    const html = '<meta name="viewport" content="x"> contact us © ' + year + ' ' + 'y'.repeat(2000);
    mockFetch({ html, url: 'https://x.test' });
    const r = await assessWebsite('x.test');
    expect(r.flags).not.toContain('stale-copyright');
  });
});

describe('bad-website-heuristic: page with no copyright year', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });
  it('does not flag stale-copyright when no year is present', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, url: 'https://x.test',
      text: () => Promise.resolve('<meta name="viewport" content="x"> book now ' + 'z'.repeat(2000)),
    }) as unknown as typeof fetch;
    const r = await assessWebsite('x.test');
    expect(r.flags).not.toContain('stale-copyright');
  });
});

import { parseInboundEmail } from '@/lib/integrations/resend-inbound';

describe('resend-inbound: parseInboundEmail', () => {
  it('rejects non-objects and non-inbound event types', () => {
    expect(parseInboundEmail(null)).toBeNull();
    expect(parseInboundEmail('x')).toBeNull();
    expect(parseInboundEmail({ type: 'email.sent', data: { from: 'a@b.test' } })).toBeNull();
  });

  it('rejects when data is missing/invalid or there is no sender', () => {
    expect(parseInboundEmail({ data: null })).toBeNull();
    expect(parseInboundEmail({ from: 'not-an-email' })).toBeNull();
  });

  it('reads sender + text from a typeless flat payload (body IS data)', () => {
    expect(parseInboundEmail({ from: 'Ops <ops@x.test>', text: 'hello there' })).toEqual({ from: 'ops@x.test', text: 'hello there' });
  });

  it('reads from a nested data envelope on an inbound event', () => {
    expect(parseInboundEmail({ type: 'email.received', data: { from: 'a@b.test', text: 'hi' } })).toEqual({ from: 'a@b.test', text: 'hi' });
  });

  it('falls back to tag-stripped html when text is blank', () => {
    const r = parseInboundEmail({ from: 'a@b.test', text: '   ', html: '<p>Hello   <b>world</b></p>' });
    expect(r).toEqual({ from: 'a@b.test', text: 'Hello world' });
  });

  it('yields an empty body when neither text nor html is present', () => {
    expect(parseInboundEmail({ from: 'a@b.test' })).toEqual({ from: 'a@b.test', text: '' });
  });
});

describe('bad-website-heuristic: fetch timeout/abort path', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; vi.useRealTimers(); });
  it('aborts a hung request after the timeout and reports unreachable', async () => {
    vi.useFakeTimers();
    global.fetch = vi.fn((_url: unknown, opts: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
    ) as unknown as typeof fetch;
    const p = assessWebsite('https://slow.test');
    await vi.advanceTimersByTimeAsync(8000); // fires the setTimeout → controller.abort()
    const r = await p;
    expect(r).toMatchObject({ reachable: false, flags: ['unreachable'] });
  });
});
