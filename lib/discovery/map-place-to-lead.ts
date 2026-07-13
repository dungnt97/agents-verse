import { leads } from '../db/schema';
import { isSocialOrDirectory } from './website-presence';
import type { DiscoveredPlace, PlaceEnrichment } from './places-client';
import type { SiteAssessment } from './bad-website-heuristic';

export type DiscoveredLeadInsert = typeof leads.$inferInsert;

// Places gives company/address/location but not the pipeline fields the UI needs
// (site/score/agent/stage/demo). site/score come from the real bad-website heuristic (0 when the site
// wasn't assessed — no fabricated default); value comes from Orion's qualifier. The audit later writes the
// real scores. The DB id is
// derived from the (stable enough) placeId so re-runs map to the same row; placeId itself is the
// unique upsert key.
export function mapPlaceToLead(args: {
  place: DiscoveredPlace;
  enrichment: PlaceEnrichment;
  assessment: SiteAssessment | null;
  email: string | null;
  industry: string;
  /** Orion's qualification (value estimate); optional so manual/test callers can omit it. */
  qualified?: { value: number };
}): DiscoveredLeadInsert {
  const { place, enrichment, assessment, email, industry, qualified } = args;

  // "123 Main St, Austin, TX 78701, USA" → "Austin" (2nd-from-last comma segment); fall back to
  // the full address when the shape is unexpected.
  const parts = place.formattedAddress.split(',').map((s) => s.trim());
  const city = parts.length >= 3 ? parts[parts.length - 3] : place.formattedAddress;

  // The audit gate (run-audit) keys greenfield-vs-real off `url`, so it must NOT carry a URL the audit would
  // treat as a real site when discovery classified the lead as no-real-website. A lead is greenfield when we
  // are CONFIDENT there is no real site: no website at all, a social/directory link, or a site we assessed
  // and found unreachable. A present, non-social site that simply wasn't assessed keeps its URL (we don't
  // build a "first website" for a business that has one we just didn't check). This mirrors the auto-hunter's
  // hasRealWebsite eligibility gate, which — for enriched leads (always assessed) — makes the two agree.
  const greenfield =
    !enrichment.websiteUri || isSocialOrDirectory(enrichment.websiteUri) || assessment?.reachable === false;

  return {
    id: 'place-' + place.id,
    company: place.displayName || '(unknown)',
    industry,
    city: city || '—',
    url: greenfield || !enrichment.websiteUri ? '(no site yet)' : enrichment.websiteUri,
    site: assessment?.score ?? 0,
    score: assessment?.score ?? 0,
    value: qualified?.value ?? 0,
    agent: 'orion',
    stage: 'found',
    demo: 'draft',
    placeId: place.id,
    websiteUri: enrichment.websiteUri,
    formattedAddress: place.formattedAddress,
    lat: place.lat,
    lng: place.lng,
    businessStatus: place.businessStatus,
    primaryType: place.primaryType,
    email,
    phone: enrichment.phone,
    websiteScore: assessment?.score ?? null,
    mapsData: place.mapsData ?? null,
  };
}
