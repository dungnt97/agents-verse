import 'server-only';
import { searchBusinessesApify, enrichPlaceApify } from './places-apify';
import type { MapsData } from '../data/types';

// Google Places API (New) client via REST. Field masks are passed explicitly per request so
// the cost-sensitive two-phase split is enforced at the call site:
//   - Discovery (Pro SKU, cheap): id/name/address/location/status/type ONLY.
//   - Enrichment (Enterprise SKU, ~$7/1k): websiteUri + phone, for the filtered top-N only.
// Letting websiteUri leak into the discovery mask would bill every search call at Enterprise
// rates — so it MUST stay out of DISCOVERY_FIELD_MASK.

const PLACES_BASE = 'https://places.googleapis.com/v1';

const DISCOVERY_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.businessStatus',
  'places.primaryType',
].join(',');

const ENRICH_FIELD_MASK = ['id', 'websiteUri', 'internationalPhoneNumber'].join(',');

export interface DiscoveredPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  lat: number | null;
  lng: number | null;
  businessStatus: string;
  primaryType: string;
  // Rich Maps facts (rating/reviews/hours). Populated by the Apify provider (returned in the same scrape);
  // null for Google until its field mask is widened. Fed to demo generation for real content.
  mapsData?: MapsData | null;
}

export interface PlaceEnrichment {
  websiteUri: string | null;
  phone: string | null;
}

function apiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is required for lead discovery');
  return key;
}

// Exponential backoff on rate-limit / quota responses (HTTP 429 → RESOURCE_EXHAUSTED).
async function withBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const exhausted = err instanceof Error && /RESOURCE_EXHAUSTED|429/.test(err.message);
      if (!exhausted || attempt >= retries) throw err;
      const delayMs = 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delayMs));
      attempt += 1;
    }
  }
}

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
  primaryType?: string;
  websiteUri?: string;
  internationalPhoneNumber?: string;
}

// Phase 1 — text search with the minimal (Pro) field mask. Returns only OPERATIONAL places.
async function searchBusinessesGoogle(opts: {
  industry: string;
  city: string;
  maxResults?: number;
}): Promise<DiscoveredPlace[]> {
  const body = {
    textQuery: `${opts.industry} in ${opts.city}`,
    maxResultCount: Math.min(opts.maxResults ?? 20, 20),
  };
  const res = await withBackoff(() =>
    fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey(),
        'X-Goog-FieldMask': DISCOVERY_FIELD_MASK,
      },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) throw new Error(`Places search ${r.status}: ${await r.text()}`);
      return r.json() as Promise<{ places?: RawPlace[] }>;
    }),
  );

  return (res.places ?? [])
    .filter((p) => p.businessStatus === 'OPERATIONAL')
    .map((p) => ({
      id: p.id,
      displayName: p.displayName?.text ?? '',
      formattedAddress: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      businessStatus: p.businessStatus ?? 'OPERATIONAL',
      primaryType: p.primaryType ?? '',
    }));
}

// Phase 2 — per-place details with the Enterprise field mask. Call only for the filtered top-N.
async function enrichPlaceGoogle(placeId: string): Promise<PlaceEnrichment> {
  const res = await withBackoff(() =>
    fetch(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey(),
        'X-Goog-FieldMask': ENRICH_FIELD_MASK,
      },
    }).then(async (r) => {
      if (!r.ok) throw new Error(`Places details ${r.status}: ${await r.text()}`);
      return r.json() as Promise<RawPlace>;
    }),
  );
  return {
    websiteUri: res.websiteUri ?? null,
    phone: res.internationalPhoneNumber ?? null,
  };
}

// Provider dispatch. Default: the official Google Places API (New). Set DISCOVERY_PROVIDER=apify to route
// discovery through the Apify Google Maps Scraper instead (no Google Cloud billing required) — same
// interface, so run-discovery is unchanged. Unknown/unset value → Google.
function useApify(): boolean {
  return (process.env.DISCOVERY_PROVIDER || 'google').trim().toLowerCase() === 'apify';
}

export function searchBusinesses(opts: { industry: string; city: string; maxResults?: number }): Promise<DiscoveredPlace[]> {
  return useApify() ? searchBusinessesApify(opts) : searchBusinessesGoogle(opts);
}

export function enrichPlace(placeId: string): Promise<PlaceEnrichment> {
  return useApify() ? enrichPlaceApify(placeId) : enrichPlaceGoogle(placeId);
}
