import { and, count, eq, gte, inArray, isNotNull, notExists, sql } from 'drizzle-orm';
import { searchBusinesses, enrichPlace } from './places-client';
import { assessWebsite } from './bad-website-heuristic';
import { scrapeEmail } from './email-scraper';
import { dedupePlaces } from './dedup';
import { mapPlaceToLead, type DiscoveredLeadInsert } from './map-place-to-lead';
import { orionQualify } from './orion-qualify';
import { hasContact } from './contactability';
import { upsertDiscoveredLeads } from './upsert-discovered-leads';
import { planNextMarket, DEFAULT_MARKET_PLAN, type MarketPick, type MarketPlan } from './market-planner';
import { startPipelineRun } from '../inngest/start-pipeline-run';
import { db } from '../db/client';
import { activity, leads, settings, pipelineRuns, huntedMarkets } from '../db/schema';
import type { AutonomyMode } from '../data/deal-stage-machine';

// Worker-safe core of ONE discovery pass. Relative imports + no `server-only`/`next`/`getCurrentUser`, so
// it runs both in the web action (lib/actions/run-discovery.ts, which adds the auth gate + revalidate) and
// inside the Inngest cron (lib/inngest/functions/auto-discovery.ts) under tsx. The whole discovery
// sub-chain it pulls in (places-client, bad-website-heuristic, email-scraper, safe-fetch, orion-qualify)
// was made worker-safe for this. Writes go through `db` directly (the repository layer is server-only),
// mirroring how orchestrate-pipeline writes.

// Enterprise enrichment (websiteUri/phone) is the expensive call — cap how many of the filtered
// places we enrich per run to keep cost bounded (alongside the Cloud Console QPD cap).
const ENRICH_TOP_N = 10;

// Safety floors for AUTONOMOUS (cron) runs when the matching env cap is unset — an unattended loop must
// not run unbounded. Manual runs keep the historical 0 (no app-side cap; only the Cloud Console QPD cap).
const AUTO_DISCOVERY_DAILY_CAP = 30;
const AUTO_PIPELINE_DAILY_CAP = 10;

// Resolve a per-day cap from env: a positive integer wins; anything else — unset, 0, negative, or NaN —
// falls back to the autonomous safety floor (manual runs fall back to 0 = no app-side cap). Guards against
// a negative env value silently disabling the floor, since Number('-1') is truthy.
function resolveDailyCap(raw: string | undefined, auto: boolean, floor: number): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return auto ? floor : 0;
}

export interface DiscoveryResult {
  found: number;
  enriched: number;
  upserted: number;
  // Pipelines auto-started for the freshly discovered leads (0 in manual/review or when capped).
  started: number;
  message: string;
}

// Orchestrates one discovery pass: (auto→planner picks the market) → search (Pro) → dedupe → enrich
// top-N (Enterprise) → assess website + scrape email → map to Lead shape → upsert by placeId → record the
// hunted market → contact-gated auto-chain → log activity. Assumes the DB is live (callers guard USE_DB);
// self-guards the provider key. Never revalidates or checks auth — that is the web wrapper's job.
export async function runDiscoveryCore(input: { industry?: string; city?: string; auto?: boolean }): Promise<DiscoveryResult> {
  // Provider-key guard (shared precondition for both callers): Apify needs its token, Google (default) the
  // Maps key. Degrade with a clear message when the active provider's credential is missing.
  const provider = (process.env.DISCOVERY_PROVIDER || 'google').trim().toLowerCase();
  if (provider === 'apify' ? !process.env.APIFY_API_TOKEN : !process.env.GOOGLE_MAPS_API_KEY) {
    const need = provider === 'apify' ? 'APIFY_API_TOKEN' : 'GOOGLE_MAPS_API_KEY';
    return { found: 0, enriched: 0, upserted: 0, started: 0, message: `${need} is not configured.` };
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // App-side daily cost guard (the hard QPD cap lives in Cloud Console). Counts discovery-sourced leads
  // created today; stops before any paid call once the cap is hit. Autonomous runs get a built-in floor
  // when the env cap is unset; manual runs keep 0 (unlimited app-side, matching the prior behavior).
  const cap = resolveDailyCap(process.env.DISCOVERY_DAILY_CAP, !!input.auto, AUTO_DISCOVERY_DAILY_CAP);
  let budget = ENRICH_TOP_N;
  if (cap > 0) {
    const [{ value: todayCount }] = await db
      .select({ value: count() })
      .from(leads)
      .where(and(isNotNull(leads.placeId), gte(leads.createdAt, startOfDay)));
    if (todayCount >= cap) {
      return { found: 0, enriched: 0, upserted: 0, started: 0, message: `Daily discovery cap (${cap}) reached.` };
    }
    // Clamp THIS pass to what's left under the cap — checking only before the run let a single pass
    // overshoot by up to ENRICH_TOP_N-1 paid enrichments.
    budget = Math.min(ENRICH_TOP_N, cap - todayCount);
  }

  // Market selection: `auto` uses the Guided-auto planner (rich-country pool + rotation state); otherwise
  // the founder's typed input or the env defaults. A geo-bias regionCode comes only from the planner.
  let pick: MarketPick | null = null;
  let regionCode: string | undefined;
  if (input.auto) {
    const [s] = await db.select().from(settings).limit(1);
    const plan = (s?.marketPlan as MarketPlan | null) ?? DEFAULT_MARKET_PLAN;
    const hunted = await db.select().from(huntedMarkets);
    pick = planNextMarket(
      plan,
      hunted.map((h) => ({ country: h.country, region: h.region, niche: h.niche, lastRunAt: h.lastRunAt?.getTime() ?? null })),
    );
    if (!pick) {
      return { found: 0, enriched: 0, upserted: 0, started: 0, message: 'Autonomous hunting is off or the market pool is empty (configure settings.marketPlan).' };
    }
    regionCode = pick.regionCode;
  }
  const industry = (pick?.niche || input.industry || process.env.DISCOVERY_DEFAULT_INDUSTRY || 'dentists').trim();
  const city = (pick?.city || input.city || process.env.DISCOVERY_DEFAULT_CITY || 'Austin TX').trim();

  const places = dedupePlaces(await searchBusinesses({ industry, city, regionCode }));
  const top = places.slice(0, budget);

  const enriched: { place: (typeof top)[number]; enrichment: Awaited<ReturnType<typeof enrichPlace>>; assessment: Awaited<ReturnType<typeof assessWebsite>> | null; email: string | null }[] = [];
  for (const place of top) {
    const enrichment = await enrichPlace(place.id);
    const assessment = enrichment.websiteUri ? await assessWebsite(enrichment.websiteUri) : null;
    const email = enrichment.websiteUri ? await scrapeEmail(enrichment.websiteUri) : null;
    enriched.push({ place, enrichment, assessment, email });
  }

  // Orion (Lead Hunter) qualifies the enriched batch: real per-lead value/priority/rationale via the
  // gateway, deterministic fallback when it's off.
  const cityOf = (addr: string) => {
    const parts = addr.split(',').map((p) => p.trim());
    return (parts.length >= 3 ? parts[parts.length - 3] : addr) || city;
  };
  const qualified = await orionQualify(
    enriched.map(({ place, enrichment, assessment }) => ({
      company: place.displayName || '(unknown)',
      industry,
      city: cityOf(place.formattedAddress),
      websiteUri: enrichment.websiteUri,
      siteScore: assessment?.score ?? null,
    })),
  );
  const hot = qualified.filter((q) => q.priority === 'hot').length;
  const rows: DiscoveredLeadInsert[] = enriched.map((e, i) =>
    mapPlaceToLead({ ...e, industry, qualified: qualified[i] }),
  );

  // Upsert discovery-sourced leads keyed by the unique placeId (worker-safe helper, shared with the
  // repository surface) — re-running discovery refreshes enrichment fields instead of duplicating rows.
  const upserted = await upsertDiscoveredLeads(rows);

  // Record the hunted market (auto runs only) so the planner rotates to the next combo next time.
  if (pick) {
    const now = new Date();
    await db
      .insert(huntedMarkets)
      .values({ id: `${pick.country}|${pick.city}|${pick.niche}`, country: pick.country, region: pick.city, niche: pick.niche, lastRunAt: now, leadsFound: upserted })
      .onConflictDoUpdate({
        target: huntedMarkets.id,
        set: { lastRunAt: now, leadsFound: sql`${huntedMarkets.leadsFound} + ${upserted}` },
      });
  }

  // Auto-chain: under guarded/full, kick a pipeline for each freshly discovered CONTACTABLE lead so
  // discovery flows straight into audit→demo→outreach. Bounded by a per-day run cap (autonomous runs get
  // a built-in floor when PIPELINE_DAILY_CAP is unset) so a big batch can't exhaust the Claude-CLI burst
  // budget; each start no-ops if a run is already active for the lead.
  let started = 0;
  const [s] = await db.select().from(settings).limit(1);
  const mode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
  if (mode === 'guarded' || mode === 'full') {
    const pipelineCap = resolveDailyCap(process.env.PIPELINE_DAILY_CAP, !!input.auto, AUTO_PIPELINE_DAILY_CAP);
    let remaining = pipelineCap > 0 ? pipelineCap : Number.POSITIVE_INFINITY;
    if (pipelineCap > 0) {
      const [{ value: todayRuns }] = await db
        .select({ value: count() })
        .from(pipelineRuns)
        .where(gte(pipelineRuns.startedAt, startOfDay));
      remaining = Math.max(0, pipelineCap - Number(todayRuns));
    }
    const placeIds = rows.map((r) => r.placeId).filter((v): v is string => !!v);
    if (remaining > 0 && placeIds.length) {
      const fresh = await db
        .select({ id: leads.id, phone: leads.phone, email: leads.email })
        .from(leads)
        .where(
          and(
            inArray(leads.placeId, placeIds),
            eq(leads.stage, 'found'),
            // Never auto-start a lead that has ALREADY been through a pipeline. A success advances the lead
            // past 'found' (the stage filter drops it), but a FAILED or founder-REJECTED run leaves it at
            // 'found' with only a terminal run row — without this guard, each daily re-hunt of the same
            // market would re-pay for that lead's audit + demo (opus). Deliberate re-runs go through the
            // single-lead start action, not discovery.
            notExists(db.select({ n: sql`1` }).from(pipelineRuns).where(eq(pipelineRuns.leadId, leads.id))),
          ),
        );
      // Only chase leads we can actually reach: spending demo generation (opus) on a business with no
      // phone or email is wasted — there's no way to send them the demo. Non-contactable leads are still
      // saved (visible in the list) but not auto-pipelined.
      const contactable = fresh.filter(hasContact);
      for (const l of contactable.slice(0, remaining)) {
        const r = await startPipelineRun(l.id, mode);
        if (r.ok) started++;
      }
    }
  }

  // Log to the activity feed (seq keeps it in the newest bucket; id is unique per run).
  await db
    .insert(activity)
    .values({
      id: 'act-discovery-' + Date.now(),
      seq: Math.floor(Date.now() / 1000),
      t: 'just now',
      agent: 'orion',
      room: 'research',
      type: 'lead',
      text: `Discovered ${upserted} ${industry} lead${upserted === 1 ? '' : 's'} in ${city}${hot > 0 ? ` · ${hot} hot` : ''}`,
      status: 'info',
    })
    .onConflictDoNothing();

  return {
    found: places.length,
    enriched: rows.length,
    upserted,
    started,
    message:
      `Found ${places.length}, enriched ${rows.length}, saved ${upserted} in ${city}.` +
      (started > 0 ? ` Started ${started} pipeline${started === 1 ? '' : 's'}.` : ''),
  };
}
