import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the three worker-only modules lighthouse-client dynamically imports.
const killSpy = vi.fn();
const launchMock = vi.fn(async () => ({ port: 9222, kill: killSpy }));
const lighthouseMock = vi.fn();
vi.mock('playwright', () => ({ chromium: { executablePath: () => '/fake/chrome' } }));
vi.mock('chrome-launcher', () => ({ launch: launchMock }));
vi.mock('lighthouse', () => ({ default: lighthouseMock }));

import { runLighthouseAudit } from '@/lib/audit/lighthouse-client';

const lhr = {
  categories: {
    performance: { score: 0.4 },
    seo: { score: 0.9 },
    accessibility: { score: 0.6 },
    'best-practices': { score: 0.7 },
  },
  audits: {
    a: { score: 0.3, title: 'Bad A' },
    b: { score: 0.8, title: 'Good B (ignored)' },
    c: { score: 0.1, title: 'Bad C' },
    d: { score: 0.2 }, // no title → skipped
  },
};

beforeEach(() => {
  killSpy.mockReset();
  launchMock.mockClear();
  lighthouseMock.mockReset();
});

describe('runLighthouseAudit', () => {
  it('maps the Lighthouse result to the PageSpeedResult shape and kills chrome', async () => {
    lighthouseMock.mockResolvedValue({ lhr });
    const r = await runLighthouseAudit('example.com');
    expect(r).toEqual({
      speed: 40, // to100(0.4)
      seo: 90, // to100(0.9)
      mobile: 50, // round(((0.4+0.6)/2)*100)
      problems: ['Bad A', 'Bad C'], // score<0.5 AND has a title
      categoryScores: { performance: 0.4, seo: 0.9, accessibility: 0.6, bestPractices: 0.7 },
    });
    expect(killSpy).toHaveBeenCalledTimes(1); // browser cleaned up
    // runs mobile against the launched debug port, only the four categories
    const flags = lighthouseMock.mock.calls[0][1];
    expect(flags.port).toBe(9222);
    expect(flags.formFactor).toBe('mobile');
    expect(flags.onlyCategories).toEqual(['performance', 'seo', 'accessibility', 'best-practices']);
    // normalises a bare host to https
    expect(lighthouseMock.mock.calls[0][0]).toBe('https://example.com');
  });

  it('falls back to 50 for a missing category (null score)', async () => {
    lighthouseMock.mockResolvedValue({ lhr: { categories: {}, audits: {} } });
    const r = await runLighthouseAudit('https://x.test');
    expect(r.speed).toBe(50);
    expect(r.seo).toBe(50);
    expect(r.categoryScores).toEqual({ performance: null, seo: null, accessibility: null, bestPractices: null });
    expect(r.problems).toEqual([]);
  });

  it('throws (and still kills chrome) when lighthouse returns no result', async () => {
    lighthouseMock.mockResolvedValue(undefined);
    await expect(runLighthouseAudit('https://x.test')).rejects.toThrow(/no result/);
    expect(killSpy).toHaveBeenCalledTimes(1);
  });
});
