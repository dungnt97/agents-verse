import { leads } from '@/lib/db/schema';
import type { DiscoveredPlace, PlaceEnrichment } from './places-client';
import type { SiteAssessment } from './bad-website-heuristic';

export type DiscoveredLeadInsert = typeof leads.$inferInsert;

// Places gives company/address/location but not the pipeline fields the UI needs
// (site/score/value/agent/stage/demo) — derive the same defaults the manual addLead uses,
// overriding `site` with the heuristic score when the website was assessed. The DB id is
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

  return {
    id: 'place-' + place.id,
    company: place.displayName || '(unknown)',
    industry,
    city: city || '—',
    url: enrichment.websiteUri ?? '(no site yet)',
    site: assessment?.score ?? 38,
    score: Math.min(95, (assessment?.score ?? 38) + 40),
    value: qualified?.value ?? 2400,
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
  };
}
