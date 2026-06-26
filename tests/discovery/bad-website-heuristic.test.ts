import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { assessWebsite } from '@/lib/discovery/bad-website-heuristic';

// `assessWebsite` fetches the homepage HTML via global `fetch`, so every test stubs
// `global.fetch`. The helper below builds a Response-like object exposing only the
// surface the module touches: `ok`, `text()` and `url` (the post-redirect final URL).
function fetchResult(opts: {
  ok?: boolean;
  html?: string;
  finalUrl?: string;
}): { ok: boolean; text: () => Promise<string>; url: string } {
  return {
    ok: opts.ok ?? true,
    text: async () => opts.html ?? '',
    url: opts.finalUrl ?? 'https://example.com',
  };
}

function mockFetchOnce(result: ReturnType<typeof fetchResult>) {
  const fn = vi.fn().mockResolvedValue(result);
  vi.stubGlobal('fetch', fn);
  return fn;
}

// Neutral filler that does NOT trip any other flag: lowercase `x` only contains no CTA
// keyword, no `<table`, no `viewport`, and no copyright/year token.
function pad(n: number): string {
  return 'x'.repeat(n);
}

// A fully "healthy" homepage: https final URL, viewport meta, a clear CTA, a current-year
// copyright, > 1500 chars and no nested tables → expected to yield zero flags.
const CURRENT_YEAR = new Date().getFullYear();
function healthyHtml(): string {
  return (
    '<html><head><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '</head><body><a href="/contact">Contact us</a>' +
    `<footer>copyright ${CURRENT_YEAR} Acme Inc.</footer>` +
    `<main>${pad(1600)}</main></body></html>`
  );
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('assessWebsite — URL normalization', () => {
  it('prepends https:// when the input lacks an http(s) scheme', async () => {
    const fn = mockFetchOnce(fetchResult({ html: healthyHtml() }));
    await assessWebsite('acme.com');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe('https://acme.com');
  });

  it('passes an http(s) URL through unchanged', async () => {
    const fn = mockFetchOnce(fetchResult({ html: healthyHtml() }));
    await assessWebsite('http://acme.com');
    expect(fn.mock.calls[0][0]).toBe('http://acme.com');
  });

  it('forwards an abort signal and a custom User-Agent to fetch', async () => {
    const fn = mockFetchOnce(fetchResult({ html: healthyHtml() }));
    await assessWebsite('https://acme.com');
    const init = fn.mock.calls[0][1] as RequestInit;
    expect(init.redirect).toBe('follow');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect((init.headers as Record<string, string>)['User-Agent']).toContain('AgentsVerseBot');
  });
});

describe('assessWebsite — unreachable paths', () => {
  it('returns the unreachable result when fetch rejects', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fn);
    const res = await assessWebsite('https://broken.example');
    expect(res).toEqual({ reachable: false, score: 25, flags: ['unreachable'] });
  });

  it('returns the unreachable result on a non-ok HTTP status', async () => {
    mockFetchOnce(fetchResult({ ok: false, html: '<html></html>', finalUrl: 'https://x.example' }));
    const res = await assessWebsite('https://x.example');
    expect(res).toEqual({ reachable: false, score: 25, flags: ['unreachable'] });
  });

  it('treats an aborted (timeout) fetch as unreachable', async () => {
    const fn = vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError'));
    vi.stubGlobal('fetch', fn);
    const res = await assessWebsite('https://slow.example');
    expect(res.reachable).toBe(false);
    expect(res.flags).toEqual(['unreachable']);
  });
});

describe('assessWebsite — healthy site', () => {
  it('flags nothing and scores the full baseline of 72', async () => {
    mockFetchOnce(fetchResult({ html: healthyHtml(), finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.reachable).toBe(true);
    expect(res.flags).toEqual([]);
    expect(res.score).toBe(72);
  });
});

describe('assessWebsite — individual flags', () => {
  // Each case below starts from a healthy page and breaks exactly ONE signal, so the
  // resulting flag list and the single-flag score (60) are unambiguous.

  it('flags no-https when the final URL is not https', async () => {
    mockFetchOnce(fetchResult({ html: healthyHtml(), finalUrl: 'http://acme.com' }));
    const res = await assessWebsite('http://acme.com');
    expect(res.flags).toContain('no-https');
    expect(res.flags).toEqual(['no-https']);
    expect(res.score).toBe(60);
  });

  it('flags no-viewport when the viewport meta tag is absent', async () => {
    const html =
      '<html><head></head><body><a>Contact us</a>' +
      `<footer>copyright ${CURRENT_YEAR}</footer>${pad(1600)}</body></html>`;
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).toEqual(['no-viewport']);
    expect(res.score).toBe(60);
  });

  it('flags no-clear-cta when no CTA keyword is present', async () => {
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head>' +
      `<body><p>Welcome to our homepage</p><footer>copyright ${CURRENT_YEAR}</footer>` +
      `${pad(1600)}</body></html>`;
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).toEqual(['no-clear-cta']);
    expect(res.score).toBe(60);
  });

  it('flags stale-copyright when the newest copyright year is >= 2 years old', async () => {
    const staleYear = CURRENT_YEAR - 3;
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head>' +
      `<body><a>Contact us</a><footer>copyright ${staleYear} Acme</footer>` +
      `${pad(1600)}</body></html>`;
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).toEqual(['stale-copyright']);
    expect(res.score).toBe(60);
  });

  it('flags thin-content when the HTML is under 1500 chars', async () => {
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head>' +
      `<body><a>Contact us</a><footer>copyright ${CURRENT_YEAR}</footer></body></html>`;
    expect(html.length).toBeLessThan(1500);
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).toEqual(['thin-content']);
    expect(res.score).toBe(60);
  });

  it('flags table-layout when nested/multiple tables are present', async () => {
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head>' +
      `<body><a>Contact us</a><footer>copyright ${CURRENT_YEAR}</footer>` +
      `<table class="layout"><tr><td>${pad(1600)}</td></tr></table><table></table>` +
      '</body></html>';
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).toEqual(['table-layout']);
    expect(res.score).toBe(60);
  });
});

describe('assessWebsite — copyright edge cases', () => {
  it('does NOT flag stale-copyright for a current-year copyright', async () => {
    mockFetchOnce(fetchResult({ html: healthyHtml(), finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).not.toContain('stale-copyright');
  });

  it('does NOT flag stale-copyright for a 1-year-old copyright (below the >= 2 threshold)', async () => {
    const recentYear = CURRENT_YEAR - 1;
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head>' +
      `<body><a>Contact us</a><footer>copyright ${recentYear} Acme</footer>` +
      `${pad(1600)}</body></html>`;
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).not.toContain('stale-copyright');
  });

  it('does NOT flag stale when a leading © symbol pollutes the year list with NaN', async () => {
    // The literal `©` alternative captures no group, so its parsed year is NaN. With `©` first
    // and an old `copyright <year>` after it, the year list is [NaN, oldYear] and
    // Math.max(NaN, oldYear) === NaN → `NaN >= 2` is false → the stale rule never fires.
    const oldYear = CURRENT_YEAR - 5;
    const html =
      '<html><head><meta name="viewport" content="width=device-width"></head>' +
      // NOTE: a real © character (not the &copy; entity), which is what the regex matches.
      `<body><a>Contact us</a><footer>© copyright ${oldYear}</footer>` +
      `${pad(1600)}</body></html>`;
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags).not.toContain('stale-copyright');
    expect(res.flags).toEqual([]);
  });

  it('matches "copyright2019" with zero gap chars before the year', async () => {
    const html =
      '<html><head></head><body>copyright2019 only</body></html>';
    mockFetchOnce(fetchResult({ html, finalUrl: 'http://acme.com' }));
    const res = await assessWebsite('http://acme.com');
    // Thin + stale + no-https + no-viewport + no-clear-cta all fire here.
    expect(res.flags).toContain('stale-copyright');
  });
});

describe('assessWebsite — score flooring', () => {
  it('floors the score at 12 when many flags fire', async () => {
    // A maximally weak page: no-https, no-viewport, no-clear-cta, stale-copyright,
    // thin-content and table-layout — 6 flags → 72 - 72 = 0 → floored to 12.
    const staleYear = CURRENT_YEAR - 4;
    const html = `<html><body>copyright ${staleYear}<table></table><table></table></body></html>`;
    const fn = mockFetchOnce(fetchResult({ html, finalUrl: 'http://weak.example' }));
    const res = await assessWebsite('http://weak.example');
    expect(fn).toHaveBeenCalled();
    expect(res.reachable).toBe(true);
    expect(res.flags).toEqual(
      expect.arrayContaining([
        'no-https',
        'no-viewport',
        'no-clear-cta',
        'stale-copyright',
        'thin-content',
        'table-layout',
      ]),
    );
    expect(res.flags.length).toBe(6);
    expect(res.score).toBe(12);
  });

  it('produces an intermediate score for a couple of flags (48 for two)', async () => {
    // no-viewport + no-clear-cta only; https, recent copyright, long, single table.
    const html =
      '<html><head></head><body><p>hello world</p>' +
      `<footer>copyright ${CURRENT_YEAR}</footer>${pad(1600)}</body></html>`;
    mockFetchOnce(fetchResult({ html, finalUrl: 'https://acme.com' }));
    const res = await assessWebsite('https://acme.com');
    expect(res.flags.sort()).toEqual(['no-clear-cta', 'no-viewport']);
    expect(res.score).toBe(48);
  });
});
