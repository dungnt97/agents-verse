import { describe, it, expect } from 'vitest';

import {
  computeCostMeter,
  DEFAULT_COST_PER_RUN,
  DEFAULT_DAILY_CAP,
  COST_ALERT_FRACTION,
} from '@/lib/data/cost-meter';

// The cost meter drives the Ledger's >80%-of-cap escalation. These pin the estimate math + the
// near/over-cap thresholds so a refactor can't silently move when the founder gets warned.
describe('computeCostMeter', () => {
  it('estimates cost as runs × per-run rate (rounded to cents)', () => {
    const m = computeCostMeter(10, { costPerRun: 0.4, dailyCap: 50 });
    expect(m.estimatedCost).toBe(4);
    expect(m.runs).toBe(10);
    expect(m.fractionUsed).toBeCloseTo(0.08);
    expect(m.nearCap).toBe(false);
    expect(m.overCap).toBe(false);
  });

  it('flags nearCap at exactly 80% of the cap (the alert threshold)', () => {
    // 100 runs × $0.40 = $40 = 80% of a $50 cap.
    const m = computeCostMeter(100, { costPerRun: 0.4, dailyCap: 50 });
    expect(m.estimatedCost).toBe(40);
    expect(m.fractionUsed).toBeCloseTo(COST_ALERT_FRACTION);
    expect(m.nearCap).toBe(true);
    expect(m.overCap).toBe(false);
  });

  it('flags overCap at/above 100%', () => {
    const m = computeCostMeter(125, { costPerRun: 0.4, dailyCap: 50 });
    expect(m.estimatedCost).toBe(50);
    expect(m.overCap).toBe(true);
    expect(m.nearCap).toBe(true);
  });

  it('falls back to defaults for missing / invalid rate + cap (guardrails may be unset)', () => {
    const m = computeCostMeter(5, { costPerRun: undefined, dailyCap: 'oops' as unknown });
    expect(m.costPerRun).toBe(DEFAULT_COST_PER_RUN);
    expect(m.dailyCap).toBe(DEFAULT_DAILY_CAP);
    expect(m.estimatedCost).toBe(Math.round(5 * DEFAULT_COST_PER_RUN * 100) / 100);
  });

  it('honors founder overrides for rate + cap', () => {
    const m = computeCostMeter(10, { costPerRun: 1, dailyCap: 8 });
    expect(m.estimatedCost).toBe(10);
    expect(m.dailyCap).toBe(8);
    expect(m.overCap).toBe(true);
  });

  it('treats zero / negative / non-finite runs as no spend', () => {
    for (const runs of [0, -3, NaN]) {
      const m = computeCostMeter(runs as number);
      expect(m.runs).toBe(0);
      expect(m.estimatedCost).toBe(0);
      expect(m.nearCap).toBe(false);
    }
  });
});
