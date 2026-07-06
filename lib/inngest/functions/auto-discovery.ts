import { inngest } from '../client';
import { db } from '../../db/client';
import { settings } from '../../db/schema';
import { runDiscoveryCore } from '../../discovery/run-discovery-core';
import { planHasWork, DEFAULT_MARKET_PLAN, type MarketPlan } from '../../discovery/market-planner';
import type { AutonomyMode } from '../../data/deal-stage-machine';

// Autonomous discovery cron (WORKER only — relative imports + no `server-only`, runs under tsx). On a
// schedule it asks the market planner for the next {country, metro, niche} in the founder's pool and runs
// ONE worker-safe discovery pass, which flows contactable leads straight into the pipeline. Self-gated: it
// no-ops unless autonomy is guarded/full AND the founder enabled the market pool (both default OFF), so
// registering it is harmless in environments that never opt in. Spend is bounded by the core's
// DISCOVERY_DAILY_CAP / PIPELINE_DAILY_CAP (autonomous runs carry a built-in floor when those are unset).
//
// Cron is interpreted UTC by default; override the whole expression via AUTO_DISCOVERY_CRON — e.g.
// `TZ=America/New_York 0 9 * * *` to land 9am on the US markets it hunts.
const CRON = process.env.AUTO_DISCOVERY_CRON || '0 9 * * *';

export const autoDiscovery = inngest.createFunction(
  {
    id: 'auto-discovery',
    // One hunt pass at a time — overlapping ticks would double-spend the market the planner picks before
    // the first tick records it in hunted_markets.
    concurrency: [{ limit: 1 }],
    // No retries: a failed pass isn't written to hunted_markets, so the next scheduled tick re-picks that
    // market. The cron cadence IS the retry, which avoids re-spending Apify/LLM within a single tick (the
    // core is one monolithic step, so a retry would re-run the whole search→enrich→qualify pass).
    retries: 0,
    triggers: [{ cron: CRON }],
  },
  async ({ step }) => {
    // Gate on LIVE settings so a founder autonomy/pool toggle takes effect on the next tick without a
    // redeploy. planHasWork also guards an enabled-but-empty pool (no valid country/niche selected).
    const gate = await step.run('check-autonomy', async () => {
      const [s] = await db.select().from(settings).limit(1);
      const mode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
      const plan = (s?.marketPlan as MarketPlan | null) ?? DEFAULT_MARKET_PLAN;
      return { autonomous: mode === 'guarded' || mode === 'full', hasWork: planHasWork(plan) };
    });
    if (!gate.autonomous) return { skipped: 'autonomy is manual/review' };
    if (!gate.hasWork) return { skipped: 'market plan disabled or empty' };

    // One pass; the planner inside the core picks the least-recently-hunted market in the pool.
    const result = await step.run('discover', () => runDiscoveryCore({ auto: true }));
    return result;
  },
);
