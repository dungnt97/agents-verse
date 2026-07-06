// The market planner (Guided auto): given the founder's POOL (allowed countries + niches) and the history
// of what's already been hunted, pick the NEXT (country, metro, niche) to hunt — the least-recently-hunted
// combo, so the autonomous loop rotates through the whole pool instead of hammering one market. Pure +
// deterministic (history carries timestamps; no clock here) so it's fully unit-testable and worker-safe.
import { MARKET_CATALOG, MARKET_NICHES, countryByCode } from './market-catalog';

// Founder-selected subset of the catalog, stored in settings.marketPlan.
export interface MarketPlan {
  countries: string[]; // ISO codes from the catalog
  niches: string[]; // niche strings from the catalog
  enabled: boolean; // master switch for autonomous hunting
}

// One row of hunt history (from the hunted_markets table). `lastRunAt` is epoch ms (null = never).
export interface HuntedMarket {
  country: string;
  region: string; // the metro string
  niche: string;
  lastRunAt: number | null;
}

export interface MarketPick {
  country: string; // ISO code
  regionCode: string; // = country code, for geo-biasing the Maps query
  city: string; // the metro string → the "city" portion of the search
  niche: string; // → the "industry" portion of the search
  language: string; // demo/outreach language for this market
}

export const DEFAULT_MARKET_PLAN: MarketPlan = {
  countries: ['US'],
  niches: ['nail salons', 'dental clinics', 'med spas'],
  enabled: false, // opt-in: autonomous hunting stays off until the founder turns it on
};

const key = (country: string, region: string, niche: string) => `${country}|${region}|${niche}`;

// Expand the pool into every valid (country, metro, niche) combo, in a stable catalog order.
function combos(plan: MarketPlan): MarketPick[] {
  const niches = plan.niches.filter((n) => MARKET_NICHES.includes(n));
  const out: MarketPick[] = [];
  for (const c of MARKET_CATALOG) {
    if (!plan.countries.includes(c.code)) continue;
    for (const city of c.metros) {
      for (const niche of niches) {
        out.push({ country: c.code, regionCode: c.code, city, niche, language: c.language });
      }
    }
  }
  return out;
}

// Pick the next market: the combo hunted longest ago (never-hunted first), tie-broken by catalog order.
// Returns null when the plan is disabled or expands to nothing (no valid country/niche selected).
export function planNextMarket(plan: MarketPlan, hunted: HuntedMarket[]): MarketPick | null {
  if (!plan.enabled) return null;
  const all = combos(plan);
  if (!all.length) return null;
  const lastRun = new Map<string, number>();
  for (const h of hunted) {
    if (h.lastRunAt != null) lastRun.set(key(h.country, h.region, h.niche), h.lastRunAt);
  }
  // Stable sort by lastRunAt ascending (undefined = never = -Infinity, wins); catalog order is the
  // tie-breaker because `all` is already in catalog order and Array.sort is stable.
  return [...all].sort(
    (a, b) =>
      (lastRun.get(key(a.country, a.city, a.niche)) ?? -Infinity) -
      (lastRun.get(key(b.country, b.city, b.niche)) ?? -Infinity),
  )[0];
}

// Whether a pool selects any valid market at all (for the settings UI / guard).
export function planHasWork(plan: MarketPlan): boolean {
  return plan.enabled && combos(plan).length > 0 && !!countryByCode(plan.countries[0] ?? '');
}
