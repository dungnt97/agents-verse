import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/integrations/assistant', () => ({
  assistantConfigured: vi.fn(),
  completeText: vi.fn(),
}));

import { assistantConfigured, completeText } from '@/lib/integrations/assistant';
import {
  fallbackQualify,
  buildOrionPrompt,
  parseQualified,
  orionQualify,
  type QualifyInput,
} from '@/lib/discovery/orion-qualify';

const cfg = assistantConfigured as unknown as Mock;
const complete = completeText as unknown as Mock;

function item(over: Partial<QualifyInput> = {}): QualifyInput {
  return { company: 'Acme', industry: 'Plumbing', city: 'Austin', websiteUri: 'https://acme.example', siteScore: 50, ...over };
}

describe('fallbackQualify', () => {
  it('hot/high-value for a weak current site', () => {
    const q = fallbackQualify(item({ siteScore: 20 }));
    expect(q.priority).toBe('hot');
    expect(q.value).toBe(Math.round(((100 - 20) * 55) / 100) * 100); // 4400
    expect(q.rationale).toContain('20/100');
  });
  it('warm for a mediocre site', () => {
    expect(fallbackQualify(item({ siteScore: 55 })).priority).toBe('warm');
  });
  it('cold for a strong site, value floored at 1500', () => {
    const q = fallbackQualify(item({ siteScore: 95 }));
    expect(q.priority).toBe('cold');
    expect(q.value).toBe(1500); // max(1500, (100-95)*55=275)
  });
  it('treats a null score with a website as ~mediocre (50)', () => {
    const q = fallbackQualify(item({ siteScore: null, websiteUri: 'https://x.example' }));
    expect(q.priority).toBe('warm');
    expect(q.rationale).toContain('50/100');
  });
  it('treats no website at all as the hottest signal', () => {
    const q = fallbackQualify(item({ siteScore: null, websiteUri: null }));
    expect(q.priority).toBe('hot');
    expect(q.rationale).toBe('No website found — prime greenfield prospect.');
  });
});

describe('buildOrionPrompt', () => {
  it('lists each business with site quality or NO website, and the JSON contract', () => {
    const p = buildOrionPrompt([
      item({ company: 'A', websiteUri: 'https://a.example', siteScore: 40 }),
      item({ company: 'B', websiteUri: null, siteScore: null }),
    ]);
    expect(p).toContain('1. A — Plumbing in Austin; site https://a.example (quality 40/100)');
    expect(p).toContain('2. B — Plumbing in Austin; NO website');
    expect(p).toContain('STRICT JSON');
    expect(p).toContain('"priority"');
  });
  it('shows ? when a website exists but score is null', () => {
    expect(buildOrionPrompt([item({ websiteUri: 'https://a.example', siteScore: null })])).toContain('quality ?/100');
  });
});

describe('parseQualified', () => {
  it('parses a valid array of the expected length', () => {
    const out = parseQualified('[{"value":3000,"priority":"hot","rationale":"x"}]', 1);
    expect(out).toEqual([{ value: 3000, priority: 'hot', rationale: 'x' }]);
  });
  it('coerces a string value and rounds it', () => {
    expect(parseQualified('[{"value":"2999.6","priority":"warm","rationale":"y"}]', 1)![0].value).toBe(3000);
  });
  it('falls back to warm for an unknown priority and "" for a missing rationale', () => {
    const out = parseQualified('[{"value":2000,"priority":"banana"}]', 1)!;
    expect(out[0].priority).toBe('warm');
    expect(out[0].rationale).toBe('');
  });
  it('keeps cold priority', () => {
    expect(parseQualified('[{"value":1000,"priority":"cold","rationale":"z"}]', 1)![0].priority).toBe('cold');
  });
  it('returns null when there is no JSON array', () => {
    expect(parseQualified('sorry, no json here', 1)).toBeNull();
  });
  it('returns null on malformed JSON inside the brackets', () => {
    expect(parseQualified('[ {value: oops} ]', 1)).toBeNull();
  });
  it('returns null when the length does not match', () => {
    expect(parseQualified('[{"value":1,"priority":"hot","rationale":"a"}]', 2)).toBeNull();
  });
  it('returns null when an element is not an object', () => {
    expect(parseQualified('[1, 2]', 2)).toBeNull();
  });
  it('returns null when a value is not finite', () => {
    expect(parseQualified('[{"value":"NaNish","priority":"hot","rationale":"a"}]', 1)).toBeNull();
  });
});

describe('orionQualify', () => {
  beforeEach(() => {
    cfg.mockReset();
    complete.mockReset();
  });
  it('returns [] for no items', async () => {
    expect(await orionQualify([])).toEqual([]);
    expect(cfg).not.toHaveBeenCalled();
  });
  it('uses the deterministic fallback when the gateway is not configured', async () => {
    cfg.mockReturnValue(false);
    const out = await orionQualify([item({ siteScore: 20 })]);
    expect(out[0].priority).toBe('hot');
    expect(complete).not.toHaveBeenCalled();
  });
  it('uses Orion (LLM) when configured and clamps the value range', async () => {
    cfg.mockReturnValue(true);
    complete.mockResolvedValue('[{"value":999999,"priority":"hot","rationale":"huge"},{"value":10,"priority":"cold","rationale":""}]');
    const out = await orionQualify([item(), item({ siteScore: 90 })]);
    expect(out[0].value).toBe(20000); // clamped to MAX
    expect(out[1].value).toBe(500); // clamped to MIN
    expect(out[1].rationale).toContain('90/100'); // empty LLM rationale -> fallback rationale
  });
  it('falls back when the LLM answer is unparseable', async () => {
    cfg.mockReturnValue(true);
    complete.mockResolvedValue('the leads look fine');
    const out = await orionQualify([item({ siteScore: 30 })]);
    expect(out[0].priority).toBe('hot');
  });
  it('falls back when the gateway call throws', async () => {
    cfg.mockReturnValue(true);
    complete.mockRejectedValue(new Error('gateway 503'));
    const out = await orionQualify([item({ siteScore: 55 })]);
    expect(out[0].priority).toBe('warm');
  });
});
