import { describe, it, expect } from 'vitest';

import { mapAuditResult } from '@/lib/audit/map-audit-result';
import { buildAuditFor } from '@/lib/data';
import type { Lead } from '@/lib/data/types';
import type { PageSpeedResult } from '@/lib/audit/pagespeed-client';
import type { VisionScore } from '@/lib/audit/vision-scoring';

// mapAuditResult merges three sources into one stored audit row:
//   - PSI supplies speed/seo/mobile (+ accessibility/best-practices feed problems[]).
//   - Gemini vision supplies visual/cta/trust/content/conversion (+ problems + summary).
//   - buildAuditFor(lead) supplies the industry-derived redesign and the summary fallback.
// These helpers build the minimal valid inputs; individual tests override what they assert.

const makeLead = (over: Partial<Lead> = {}): Lead => ({
  id: 'test-lead',
  company: 'Acme Co',
  industry: 'Healthcare',
  city: 'Houston',
  url: 'acme.example',
  site: 40,
  score: 85,
  value: 3000,
  agent: 'vega',
  stage: 'audited',
  demo: 'draft',
  ...over,
});

const makePsi = (over: Partial<PageSpeedResult> = {}): PageSpeedResult => ({
  speed: 70,
  seo: 80,
  mobile: 65,
  problems: ['PSI problem A', 'PSI problem B'],
  categoryScores: {
    performance: 0.7,
    seo: 0.8,
    accessibility: 0.6,
    bestPractices: 0.9,
  },
  ...over,
});

const makeVision = (over: Partial<VisionScore> = {}): VisionScore => ({
  visual: 30,
  cta: 25,
  trust: 35,
  content: 40,
  conversion: 28,
  problems: ['Vision problem 1', 'Vision problem 2', 'Vision problem 3'],
  summary: 'Vision-authored summary of the homepage.',
  ...over,
});

describe('mapAuditResult — dimension sourcing', () => {
  it('sources speed/seo/mobile from PSI and the five visual dims from vision', () => {
    const psi = makePsi({ speed: 71, seo: 82, mobile: 63 });
    const vision = makeVision({ visual: 33, cta: 27, trust: 37, content: 41, conversion: 29 });
    const { scores } = mapAuditResult({ lead: makeLead(), psi, vision });

    // PSI-sourced dimensions
    expect(scores.speed).toBe(71);
    expect(scores.seo).toBe(82);
    expect(scores.mobile).toBe(63);
    // Vision-sourced dimensions
    expect(scores.visual).toBe(33);
    expect(scores.cta).toBe(27);
    expect(scores.trust).toBe(37);
    expect(scores.content).toBe(41);
    expect(scores.conversion).toBe(29);
  });

  it('populates all 8 ScoreProfile dimensions with finite numbers', () => {
    const { scores } = mapAuditResult({ lead: makeLead(), psi: makePsi(), vision: makeVision() });
    const dims = ['visual', 'mobile', 'cta', 'trust', 'seo', 'speed', 'content', 'conversion'] as const;
    for (const d of dims) {
      expect(typeof scores[d], `dimension ${d}`).toBe('number');
      expect(Number.isFinite(scores[d]), `dimension ${d} finite`).toBe(true);
    }
    expect(Object.keys(scores).sort()).toEqual([...dims].sort());
  });

  it('does NOT cross-source: vision speed/seo/mobile-like noise never overrides PSI', () => {
    // vision has no speed/seo/mobile fields; ensure the merge takes them strictly from psi
    const psi = makePsi({ speed: 11, seo: 12, mobile: 13 });
    const { scores } = mapAuditResult({ lead: makeLead(), psi, vision: makeVision() });
    expect(scores.speed).toBe(11);
    expect(scores.seo).toBe(12);
    expect(scores.mobile).toBe(13);
  });
});

describe('mapAuditResult — problems', () => {
  it('concatenates vision problems first, then PSI problems', () => {
    const vision = makeVision({ problems: ['V1', 'V2'] });
    const psi = makePsi({ problems: ['P1', 'P2'] });
    const { problems } = mapAuditResult({ lead: makeLead(), psi, vision });
    expect(problems).toEqual(['V1', 'V2', 'P1', 'P2']);
  });

  it('caps the merged problems list at 8 entries', () => {
    const vision = makeVision({ problems: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] });
    const psi = makePsi({ problems: ['P1', 'P2', 'P3', 'P4', 'P5'] });
    const { problems } = mapAuditResult({ lead: makeLead(), psi, vision });
    expect(problems).toHaveLength(8);
    // First 6 vision + first 2 PSI (vision precedes psi, slice keeps order)
    expect(problems).toEqual(['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'P1', 'P2']);
  });

  it('handles empty problem arrays on both sides', () => {
    const { problems } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi({ problems: [] }),
      vision: makeVision({ problems: [] }),
    });
    expect(problems).toEqual([]);
  });
});

describe('mapAuditResult — confidence derivation', () => {
  it('computes 60 + present*8 + 5 when all 4 PSI categories present and vision has a summary', () => {
    const { confidence } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi(), // all 4 categoryScores non-null
      vision: makeVision({ summary: 'present' }),
    });
    // 60 + 4*8 + 5 = 97, capped at 97
    expect(confidence).toBe(97);
  });

  it('drops the +5 bonus when vision summary is empty', () => {
    const { confidence } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi(), // 4 categories present
      vision: makeVision({ summary: '' }),
    });
    // 60 + 4*8 + 0 = 92
    expect(confidence).toBe(92);
  });

  it('lowers confidence as PSI categories go missing (null)', () => {
    const { confidence } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi({
        categoryScores: { performance: 0.7, seo: null, accessibility: null, bestPractices: null },
      }),
      vision: makeVision({ summary: 'has summary' }),
    });
    // present = 1 → 60 + 1*8 + 5 = 73
    expect(confidence).toBe(73);
  });

  it('floors at 60 + 5 when no PSI categories present but a summary exists', () => {
    const { confidence } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi({
        categoryScores: { performance: null, seo: null, accessibility: null, bestPractices: null },
      }),
      vision: makeVision({ summary: 'x' }),
    });
    // 60 + 0 + 5 = 65
    expect(confidence).toBe(65);
  });

  it('hits the true floor of 60 when no PSI categories present and no summary', () => {
    const { confidence } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi({
        categoryScores: { performance: null, seo: null, accessibility: null, bestPractices: null },
      }),
      vision: makeVision({ summary: '' }),
    });
    // 60 + 0 + 0 = 60
    expect(confidence).toBe(60);
  });

  it('caps confidence at 97 even at maximum coverage', () => {
    const { confidence } = mapAuditResult({
      lead: makeLead(),
      psi: makePsi(),
      vision: makeVision({ summary: 'full' }),
    });
    expect(confidence).toBeLessThanOrEqual(97);
    expect(confidence).toBe(97);
  });
});

describe('mapAuditResult — summary fallback', () => {
  it('uses the vision summary when present', () => {
    const vision = makeVision({ summary: 'AI-written homepage critique.' });
    const { summary } = mapAuditResult({ lead: makeLead(), psi: makePsi(), vision });
    expect(summary).toBe('AI-written homepage critique.');
  });

  it('falls back to the lead-derived summary when vision summary is blank', () => {
    const lead = makeLead();
    const vision = makeVision({ summary: '' });
    const derived = buildAuditFor(lead);
    const { summary } = mapAuditResult({ lead, psi: makePsi(), vision });
    expect(summary).toBe(derived.summary);
    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toContain(lead.company);
  });
});

describe('mapAuditResult — redesign direction', () => {
  it('carries the industry-derived redesign verbatim from buildAuditFor', () => {
    const lead = makeLead({ industry: 'Hospitality' });
    const derived = buildAuditFor(lead);
    const { redesign } = mapAuditResult({ lead, psi: makePsi(), vision: makeVision() });
    expect(redesign).toEqual(derived.redesign);
    // Hospitality redesign has a known CTA shape
    expect(redesign.cta).toBe('Reserve a table');
    expect(redesign.template).toBe('Restaurant demo template');
    expect(Array.isArray(redesign.sections)).toBe(true);
    expect(redesign.sections.length).toBeGreaterThan(0);
  });

  it('falls back to the Healthcare redesign for an unknown industry', () => {
    const lead = makeLead({ industry: 'NonexistentIndustry' });
    const healthcareDerived = buildAuditFor(makeLead({ industry: 'Healthcare' }));
    const { redesign } = mapAuditResult({ lead, psi: makePsi(), vision: makeVision() });
    expect(redesign).toEqual(healthcareDerived.redesign);
  });

  it('returns a fully-shaped Redesign object', () => {
    const { redesign } = mapAuditResult({ lead: makeLead(), psi: makePsi(), vision: makeVision() });
    expect(typeof redesign.style).toBe('string');
    expect(typeof redesign.cta).toBe('string');
    expect(typeof redesign.content).toBe('string');
    expect(typeof redesign.template).toBe('string');
    expect(Array.isArray(redesign.sections)).toBe(true);
  });
});

describe('mapAuditResult — edge cases (boundary + out-of-range inputs)', () => {
  const dims = ['visual', 'mobile', 'cta', 'trust', 'seo', 'speed', 'content', 'conversion'] as const;

  it('passes all-zero inputs through unchanged across every dimension', () => {
    const psi = makePsi({
      speed: 0,
      seo: 0,
      mobile: 0,
      categoryScores: { performance: 0, seo: 0, accessibility: 0, bestPractices: 0 },
    });
    const vision = makeVision({ visual: 0, cta: 0, trust: 0, content: 0, conversion: 0 });
    const { scores, confidence } = mapAuditResult({ lead: makeLead({ site: 0, score: 0 }), psi, vision });
    for (const d of dims) expect(scores[d], `dim ${d}`).toBe(0);
    // categoryScores all 0 (not null) → still counted as present (filter is != null)
    // present = 4 → 60 + 32 + 5 = 97
    expect(confidence).toBe(97);
  });

  it('passes all-100 inputs through unchanged across every dimension', () => {
    const psi = makePsi({
      speed: 100,
      seo: 100,
      mobile: 100,
      categoryScores: { performance: 1, seo: 1, accessibility: 1, bestPractices: 1 },
    });
    const vision = makeVision({ visual: 100, cta: 100, trust: 100, content: 100, conversion: 100 });
    const { scores, confidence } = mapAuditResult({ lead: makeLead({ site: 100, score: 100 }), psi, vision });
    for (const d of dims) expect(scores[d], `dim ${d}`).toBe(100);
    expect(confidence).toBe(97);
  });

  it('does NOT clamp out-of-range inputs (clamping happens upstream in PSI/vision parsers)', () => {
    // mapAuditResult is a pure merge; pagespeed-client and vision-scoring already clamp to 0-100
    // before this point, so the merge intentionally passes values straight through without re-clamping.
    const psi = makePsi({ speed: 150, seo: -10, mobile: 200 });
    const vision = makeVision({ visual: -5, cta: 120, trust: 999, content: -100, conversion: 50 });
    const { scores } = mapAuditResult({ lead: makeLead(), psi, vision });
    expect(scores.speed).toBe(150);
    expect(scores.seo).toBe(-10);
    expect(scores.mobile).toBe(200);
    expect(scores.visual).toBe(-5);
    expect(scores.cta).toBe(120);
    expect(scores.trust).toBe(999);
    expect(scores.content).toBe(-100);
    expect(scores.conversion).toBe(50);
  });

  it('confidence treats categoryScore value 0 as present (only null counts as missing)', () => {
    // Distinguish "0 score" (present) from "null" (missing): the impl filters on != null.
    const withZeros = mapAuditResult({
      lead: makeLead(),
      psi: makePsi({ categoryScores: { performance: 0, seo: 0, accessibility: null, bestPractices: null } }),
      vision: makeVision({ summary: 's' }),
    });
    // present = 2 (the two 0s) → 60 + 16 + 5 = 81
    expect(withZeros.confidence).toBe(81);
  });
});

describe('mapAuditResult — full shape integrity', () => {
  it('returns exactly the MappedAudit keys', () => {
    const result = mapAuditResult({ lead: makeLead(), psi: makePsi(), vision: makeVision() });
    expect(Object.keys(result).sort()).toEqual(
      ['confidence', 'problems', 'redesign', 'scores', 'summary'].sort(),
    );
    expect(typeof result.confidence).toBe('number');
    expect(Array.isArray(result.problems)).toBe(true);
    expect(typeof result.summary).toBe('string');
  });
});
