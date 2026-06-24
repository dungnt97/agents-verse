'use server';

import { revalidatePath } from 'next/cache';
import { and, count, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { searchBusinesses, enrichPlace } from '@/lib/discovery/places-client';
import { assessWebsite } from '@/lib/discovery/bad-website-heuristic';
import { scrapeEmail } from '@/lib/discovery/email-scraper';
import { dedupePlaces } from '@/lib/discovery/dedup';
import { mapPlaceToLead, type DiscoveredLeadInsert } from '@/lib/discovery/map-place-to-lead';
import { upsertDiscoveredLeads } from '@/lib/repositories/leads';
import { USE_DB } from '@/lib/repositories/config';
import { getCurrentUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { activity, leads, settings, pipelineRuns } from '@/lib/db/schema';
import { startPipeline } from './start-pipeline';
import type { AutonomyMode } from '@/lib/data/deal-stage-machine';

// Enterprise enrichment (websiteUri/phone) is the expensive call — cap how many of the filtered
// places we enrich per run to keep cost bounded (alongside the Cloud Console QPD cap).
const ENRICH_TOP_N = 10;

export interface DiscoveryResult {
  found: number;
  enriched: number;
  upserted: number;
  // Pipelines auto-started for the freshly discovered leads (0 in manual/review or when capped).
  started: number;
  message: string;
}

// Orchestrates one discovery pass: search (Pro) → dedupe → enrich top-N (Enterprise) → assess
// website + scrape email → map to Lead shape → upsert by placeId → log activity. Server action
// (first-cut; promote to a durable workflow when throttling/approval is needed). DB-only.
export async function runDiscovery(input: { industry?: string; city?: string }): Promise<DiscoveryResult> {
  if (!USE_DB) {
    return { found: 0, enriched: 0, upserted: 0, started: 0, message: 'Discovery requires the database (set USE_DB=true).' };
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return { found: 0, enriched: 0, upserted: 0, started: 0, message: 'GOOGLE_MAPS_API_KEY is not configured.' };
  }
  // Authenticated-only: this spends real (Enterprise-SKU) money, so it must verify the session,
  // not rely on the cookie-existence middleware check.
  if (!(await getCurrentUser())) throw new Error('Unauthorized');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // App-side daily cost guard (the hard QPD cap lives in Cloud Console). Counts discovery-sourced
  // leads created today; stops before any paid call once the cap is hit.
  const cap = Number(process.env.DISCOVERY_DAILY_CAP) || 0;
  if (cap > 0) {
    const [{ value: todayCount }] = await db
      .select({ value: count() })
      .from(leads)
      .where(and(isNotNull(leads.placeId), gte(leads.createdAt, startOfDay)));
    if (todayCount >= cap) {
      return { found: 0, enriched: 0, upserted: 0, started: 0, message: `Daily discovery cap (${cap}) reached.` };
    }
  }

  const industry = (input.industry || process.env.DISCOVERY_DEFAULT_INDUSTRY || 'dentists').trim();
  const city = (input.city || process.env.DISCOVERY_DEFAULT_CITY || 'Austin TX').trim();

  const places = dedupePlaces(await searchBusinesses({ industry, city }));
  const top = places.slice(0, ENRICH_TOP_N);

  const rows: DiscoveredLeadInsert[] = [];
  for (const place of top) {
    const enrichment = await enrichPlace(place.id);
    const assessment = enrichment.websiteUri ? await assessWebsite(enrichment.websiteUri) : null;
    const email = enrichment.websiteUri ? await scrapeEmail(enrichment.websiteUri) : null;
    rows.push(mapPlaceToLead({ place, enrichment, assessment, email, industry }));
  }

  const upserted = await upsertDiscoveredLeads(rows);

  // Auto-chain: under guarded/full, kick a pipeline for each freshly discovered lead so discovery flows
  // straight into audit→demo→outreach. Bounded by a per-day run cap (PIPELINE_DAILY_CAP) so a big batch
  // can't exhaust the Claude-CLI burst budget; each start no-ops if a run is already active for the lead.
  let started = 0;
  const [s] = await db.select().from(settings).limit(1);
  const mode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
  if (mode === 'guarded' || mode === 'full') {
    const pipelineCap = Number(process.env.PIPELINE_DAILY_CAP) || 0;
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
        .select({ id: leads.id })
        .from(leads)
        .where(and(inArray(leads.placeId, placeIds), eq(leads.stage, 'found')));
      for (const l of fresh.slice(0, remaining)) {
        const r = await startPipeline(l.id);
        if (r.ok) started++;
      }
    }
  }

  // Log to the activity feed (seq 0 keeps it in the newest bucket; id is unique per run).
  await db
    .insert(activity)
    .values({
      id: 'act-discovery-' + Date.now(),
      seq: 0,
      t: 'just now',
      agent: 'orion',
      room: 'research',
      type: 'lead',
      text: `Discovered ${upserted} ${industry} lead${upserted === 1 ? '' : 's'} in ${city}`,
      status: 'info',
    })
    .onConflictDoNothing();

  revalidatePath('/leads');
  revalidatePath('/overview');

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
