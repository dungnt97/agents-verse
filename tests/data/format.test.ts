import { describe, it, expect } from 'vitest';

import {
  fmt,
  statusMap,
  stages,
  SCORE_LABELS,
  DEMO_STATUS,
  DEAL_STAGE,
  REQ_STATUS,
  hueFor,
  relativeTime,
  humanizeAuditError,
} from '@/lib/data/format';

// `lib/data/format.ts` is the single client-safe source of presentation constants
// and pure formatting helpers. These tests pin the exact rendered output (currency
// strings, badge classes, pipeline order, deterministic hue) so a refactor that
// silently changes a label, class, or rounding rule is caught.

describe('fmt.money', () => {
  it('prefixes with $ and inserts en-US thousands separators, no decimals', () => {
    expect(fmt.money(1234)).toBe('$1,234');
    expect(fmt.money(1234567)).toBe('$1,234,567');
  });

  it('formats small values without a separator', () => {
    expect(fmt.money(0)).toBe('$0');
    expect(fmt.money(7)).toBe('$7');
    expect(fmt.money(999)).toBe('$999');
  });

  it('drops the fractional part via toLocaleString default (3 significant fraction digits max, rounded)', () => {
    // Number.toLocaleString('en-US') defaults to max 3 fraction digits, rounding.
    expect(fmt.money(1234.5)).toBe('$1,234.5');
    expect(fmt.money(0.25)).toBe('$0.25');
  });

  it('places the sign before the $ for negatives (string concat puts $ first)', () => {
    // Implementation is `'$' + n.toLocaleString(...)`, so the minus lands after the $.
    expect(fmt.money(-1500)).toBe('$-1,500');
  });
});

describe('fmt.k', () => {
  it('compacts values >= 1000 into "$X.Xk" with one decimal', () => {
    expect(fmt.k(1000)).toBe('$1.0k');
    expect(fmt.k(1500)).toBe('$1.5k');
    expect(fmt.k(12000)).toBe('$12.0k');
    expect(fmt.k(1234567)).toBe('$1234.6k');
  });

  it('rounds to one decimal at the k scale', () => {
    expect(fmt.k(1234)).toBe('$1.2k'); // 1.234 -> 1.2
    expect(fmt.k(1250)).toBe('$1.3k'); // 1.25 -> 1.3 (round half up via toFixed)
  });

  it('renders values below 1000 verbatim with a $ prefix (no separator, no decimals)', () => {
    expect(fmt.k(0)).toBe('$0');
    expect(fmt.k(999)).toBe('$999');
    expect(fmt.k(50)).toBe('$50');
  });

  it('uses 1000 as the inclusive boundary for compacting', () => {
    expect(fmt.k(999)).toBe('$999');
    expect(fmt.k(1000)).toBe('$1.0k');
  });
});

describe('fmt.money2', () => {
  it('always renders exactly two decimal places', () => {
    expect(fmt.money2(0)).toBe('$0.00');
    expect(fmt.money2(1234.5)).toBe('$1234.50');
    expect(fmt.money2(9.999)).toBe('$10.00');
  });
});

describe('statusMap', () => {
  it('maps known status keys to their expected label/cls/dot triples', () => {
    expect(statusMap.active).toEqual({ label: 'Active', cls: 'badge-success', dot: 'var(--success)' });
    expect(statusMap.idle).toEqual({ label: 'Idle', cls: 'badge-neutral', dot: 'var(--ink-3)' });
    expect(statusMap.escalate).toEqual({ label: 'Escalating', cls: 'badge-danger', dot: 'var(--danger)' });
    expect(statusMap.review).toEqual({ label: 'Needs review', cls: 'badge-warning', dot: 'var(--warning)' });
  });

  it('exposes exactly the expected set of status keys', () => {
    expect(Object.keys(statusMap).sort()).toEqual(
      ['active', 'escalate', 'idle', 'paused', 'review', 'waiting', 'warning', 'working'].sort(),
    );
  });

  it('every entry is well-formed: non-empty label, badge-* cls, var(--*) dot', () => {
    for (const [key, entry] of Object.entries(statusMap)) {
      expect(entry.label.trim(), `label for "${key}"`).not.toBe('');
      expect(entry.cls, `cls for "${key}"`).toMatch(/^badge-[a-z]+$/);
      expect(entry.dot, `dot for "${key}"`).toMatch(/^var\(--[a-z0-9-]+\)$/);
    }
  });
});

describe('stages (lead pipeline)', () => {
  it('is the expected ordered pipeline of id/label pairs', () => {
    expect(stages).toEqual([
      { id: 'found', label: 'Found' },
      { id: 'audited', label: 'Audited' },
      { id: 'demo', label: 'Demo Generated' },
      { id: 'contacted', label: 'Contacted' },
      { id: 'replied', label: 'Replied' },
      { id: 'won', label: 'Deal Won' },
    ]);
  });

  it('preserves order with "found" first and "won" last (terminal state)', () => {
    expect(stages[0].id).toBe('found');
    expect(stages[stages.length - 1].id).toBe('won');
  });

  it('has unique stage ids', () => {
    const ids = stages.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('SCORE_LABELS', () => {
  it('is an ordered list of [key, label] tuples covering all eight audit dimensions', () => {
    expect(SCORE_LABELS).toEqual([
      ['visual', 'Visual design'],
      ['mobile', 'Mobile UX'],
      ['cta', 'CTA clarity'],
      ['trust', 'Trust signals'],
      ['seo', 'SEO basics'],
      ['speed', 'Speed impression'],
      ['content', 'Content quality'],
      ['conversion', 'Conversion potential'],
    ]);
  });

  it('has unique keys and non-empty labels', () => {
    const keys = SCORE_LABELS.map(([k]) => k);
    expect(new Set(keys).size).toBe(keys.length);
    for (const [k, label] of SCORE_LABELS) {
      expect(label.trim(), `label for "${k}"`).not.toBe('');
    }
  });
});

describe('badge status maps (DEMO_STATUS, DEAL_STAGE, REQ_STATUS)', () => {
  it('DEMO_STATUS maps representative keys to expected label/cls', () => {
    expect(DEMO_STATUS.review).toEqual({ label: 'Needs review', cls: 'badge-warning' });
    expect(DEMO_STATUS.won).toEqual({ label: 'Won', cls: 'badge-success' });
    expect(DEMO_STATUS.draft).toEqual({ label: 'Generated', cls: 'badge-neutral' });
    expect(Object.keys(DEMO_STATUS).sort()).toEqual(
      ['approved', 'draft', 'replied', 'review', 'sent', 'won'].sort(),
    );
  });

  it('DEAL_STAGE maps representative keys to expected label/cls', () => {
    expect(DEAL_STAGE.created).toEqual({ label: 'Deal created', cls: 'badge-primary' });
    expect(DEAL_STAGE.call).toEqual({ label: 'Human call requested', cls: 'badge-danger' });
    expect(DEAL_STAGE.won).toEqual({ label: 'Won', cls: 'badge-success' });
    expect(DEAL_STAGE.lost).toEqual({ label: 'Lost', cls: 'badge-neutral' });
    expect(Object.keys(DEAL_STAGE).sort()).toEqual(
      ['approval', 'call', 'created', 'lost', 'pricing', 'quoted', 'won'].sort(),
    );
  });

  it('REQ_STATUS maps representative keys to expected label/cls', () => {
    expect(REQ_STATUS.new).toEqual({ label: 'New', cls: 'badge-warning' });
    expect(REQ_STATUS.converted).toEqual({ label: 'Converted', cls: 'badge-success' });
    expect(REQ_STATUS.declined).toEqual({ label: 'Declined', cls: 'badge-neutral' });
    expect(Object.keys(REQ_STATUS).sort()).toEqual(
      ['contacted', 'converted', 'declined', 'new', 'reviewing'].sort(),
    );
  });

  it('every entry across all three maps is well-formed (non-empty label, badge-* cls)', () => {
    const allMaps = { DEMO_STATUS, DEAL_STAGE, REQ_STATUS };
    for (const [mapName, map] of Object.entries(allMaps)) {
      for (const [key, entry] of Object.entries(map)) {
        expect(entry.label.trim(), `${mapName}.${key} label`).not.toBe('');
        expect(entry.cls, `${mapName}.${key} cls`).toMatch(/^badge-[a-z]+$/);
      }
    }
  });
});

describe('hueFor', () => {
  it('returns the mapped hue for known industries', () => {
    expect(hueFor('Healthcare')).toBe(200);
    expect(hueFor('Wellness')).toBe(300);
    expect(hueFor('Hospitality')).toBe(140);
    expect(hueFor('Real Estate')).toBe(40);
    expect(hueFor('Logistics')).toBe(230);
    expect(hueFor('Fitness')).toBe(20);
  });

  it('falls back to 220 for unknown industries', () => {
    expect(hueFor('Unknown')).toBe(220);
    expect(hueFor('')).toBe(220);
    expect(hueFor('healthcare')).toBe(220); // case-sensitive: lowercase misses the map
  });

  it('is deterministic (same input → same output)', () => {
    expect(hueFor('Healthcare')).toBe(hueFor('Healthcare'));
    expect(hueFor('zzz')).toBe(hueFor('zzz'));
  });

  it('returns a number within the valid HSL hue range [0, 360)', () => {
    const samples = ['Healthcare', 'Wellness', 'Hospitality', 'Real Estate', 'Logistics', 'Fitness', 'Unknown'];
    for (const ind of samples) {
      const hue = hueFor(ind);
      expect(typeof hue).toBe('number');
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('varies across different known inputs (not a constant)', () => {
    const hues = new Set(['Healthcare', 'Wellness', 'Hospitality', 'Fitness'].map(hueFor));
    expect(hues.size).toBeGreaterThan(1);
  });
});


describe('relativeTime', () => {
  const now = Math.floor(Date.now() / 1000);
  it('reports "just now" under a minute (and clamps future timestamps)', () => {
    expect(relativeTime(now)).toBe('just now');
    expect(relativeTime(now - 30)).toBe('just now');
    expect(relativeTime(now + 100)).toBe('just now');
  });
  it('reports minutes between 1m and 1h', () => {
    expect(relativeTime(now - 120)).toBe('2 min ago');
  });
  it('reports hours between 1h and 1d', () => {
    expect(relativeTime(now - 2 * 3600)).toBe('2h ago');
  });
  it('reports days beyond 1d', () => {
    expect(relativeTime(now - 3 * 86400)).toBe('3d ago');
  });
});


describe('fmt.humanizeAuditError', () => {
  it('explains an unreachable site (PageSpeed/Lighthouse load failure)', () => {
    expect(humanizeAuditError('PageSpeed 400: {"error":{"message":"Lighthouse returned error: FAILED_DOCUMENT_REQUEST. Lighthouse was unable to reliably load the page (net::ERR_CONNECTION_FAILED)"}}'))
      .toBe("Couldn't load the site — the URL may be unreachable, offline, or not a real domain.");
  });
  it('explains rate limiting', () => {
    expect(humanizeAuditError('PageSpeed 429: quota exceeded')).toMatch(/rate-limited/);
  });
  it('explains an auth / config failure', () => {
    expect(humanizeAuditError('PageSpeed 403: API key not valid')).toMatch(/API key|configuration/);
  });
  it('explains a timeout', () => {
    expect(humanizeAuditError('Error: ETIMEDOUT loading site')).toMatch(/timed out/);
  });
  it('falls back to a generic message for empty / null errors', () => {
    expect(humanizeAuditError('')).toBe('The audit could not complete.');
    expect(humanizeAuditError(null)).toBe('The audit could not complete.');
    expect(humanizeAuditError('!!')).toBe('The audit could not complete.');
  });
  it('trims a noisy first line for an unrecognized error', () => {
    expect(humanizeAuditError('Something odd happened {bigjson...}')).toBe('Something odd happened');
  });
});
