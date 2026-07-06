import { describe, it, expect } from 'vitest';
import { planNextMarket, planHasWork, DEFAULT_MARKET_PLAN, type MarketPlan } from '@/lib/discovery/market-planner';

const plan = (over: Partial<MarketPlan> = {}): MarketPlan => ({
  countries: ['US'],
  niches: ['nail salons', 'dental clinics'],
  enabled: true,
  ...over,
});

describe('planNextMarket', () => {
  it('returns null when the plan is disabled or empty', () => {
    expect(planNextMarket(plan({ enabled: false }), [])).toBeNull();
    expect(planNextMarket(plan({ countries: [] }), [])).toBeNull();
    expect(planNextMarket(plan({ niches: [] }), [])).toBeNull();
    expect(planNextMarket(plan({ niches: ['not-a-real-niche'] }), [])).toBeNull();
  });

  it('with no history, picks the first combo in catalog order', () => {
    const pick = planNextMarket(plan(), []);
    expect(pick).toMatchObject({ country: 'US', regionCode: 'US', city: 'Austin TX', niche: 'nail salons', language: 'English' });
  });

  it('rotates: a never-hunted combo beats any already-hunted one', () => {
    // Austin×nail already hunted → next should be a different, never-hunted combo.
    const pick = planNextMarket(plan(), [{ country: 'US', region: 'Austin TX', niche: 'nail salons', lastRunAt: 1000 }]);
    expect(pick).not.toMatchObject({ city: 'Austin TX', niche: 'nail salons' });
    expect(pick?.country).toBe('US');
  });

  it('when all are hunted, picks the least-recently-hunted', () => {
    const p = plan({ countries: ['IE'], niches: ['nail salons'] }); // IE has 3 metros × 1 niche = 3 combos
    const hunted = [
      { country: 'IE', region: 'Dublin', niche: 'nail salons', lastRunAt: 300 },
      { country: 'IE', region: 'Cork', niche: 'nail salons', lastRunAt: 100 }, // oldest
      { country: 'IE', region: 'Galway', niche: 'nail salons', lastRunAt: 200 },
    ];
    expect(planNextMarket(p, hunted)).toMatchObject({ city: 'Cork' });
  });

  it('geo-bias: regionCode equals the ISO country code', () => {
    expect(planNextMarket(plan({ countries: ['GB'], niches: ['dental clinics'] }), [])).toMatchObject({
      regionCode: 'GB',
      language: 'English',
    });
  });
});

describe('planHasWork / defaults', () => {
  it('the default plan is opt-in (disabled)', () => {
    expect(DEFAULT_MARKET_PLAN.enabled).toBe(false);
    expect(planHasWork(DEFAULT_MARKET_PLAN)).toBe(false);
  });
  it('an enabled pool with valid selections has work', () => {
    expect(planHasWork(plan())).toBe(true);
  });
});
