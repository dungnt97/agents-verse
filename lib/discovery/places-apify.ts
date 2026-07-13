// Worker-safe (no `server-only`) so the discovery cron can import it under tsx via run-discovery-core.
import type { DiscoveredPlace, PlaceEnrichment } from './places-client';
import type { MapsData } from '../data/types';

// Apify "Google Maps Scraper" (compass/crawler-google-places) as a discovery provider — an alternative
// to the official Google Places API for environments where Google Cloud billing isn't available. ONE
// scrape run returns name + address + website + phone + coords, so unlike Google's cheap-search /
// paid-enrich split there is no second per-place call: searchBusinesses stashes each place's
// website/phone, and enrichPlace serves them from that stash. Pay-as-you-go on Apify (billed to the
// APIFY_API_TOKEN owner), decoupled from Google.

const ACTOR = 'compass~crawler-google-places';
// run-sync-get-dataset-items blocks until the run finishes and returns the dataset inline. Apify caps
// this at ~300s; keep the client timeout just under that so a stuck run surfaces as an error, not a hang.
const RUN_TIMEOUT_MS = 280_000;

function token(): string {
  const t = process.env.APIFY_API_TOKEN;
  if (!t) throw new Error('APIFY_API_TOKEN is required for the Apify discovery provider');
  return t;
}

// Shape of the fields we read from a scraped place (the actor returns many more, ignored here).
interface ApifyPlace {
  placeId?: string;
  title?: string;
  address?: string;
  phone?: string;
  website?: string;
  categoryName?: string;
  location?: { lat?: number; lng?: number };
  url?: string;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
  // Rich facts — captured into MapsData for demo generation (real content, not invented).
  totalScore?: number;
  reviewsCount?: number;
  reviews?: { text?: string | null; stars?: number | null; name?: string | null }[];
  openingHours?: { day?: string; hours?: string }[];
  categories?: string[];
  price?: string | null;
  imageUrls?: string[]; // venue photos (Google-hosted); present when maxImages > 0
}

// Number of review texts to scrape per place (for real testimonials). Each review adds Apify cost, so it
// is capped + env-tunable; 0 skips review text entirely (rating/hours/categories still come for free).
// Bumped past the ~5 we feature so demo-gen has a real pool to CURATE the strongest testimonials from.
const MAX_REVIEWS = Math.max(0, Number(process.env.APIFY_MAX_REVIEWS ?? 10));
// Which reviews to pull. 'mostRelevant' = Google's surfaced, detailed reviews (best raw material for
// testimonials); tunable to newest/highestRanking/lowestRanking.
const REVIEWS_SORT = (process.env.APIFY_REVIEWS_SORT || 'mostRelevant').trim();
// Real venue photos per place (demo-gen curates + embeds the best). Each image adds Apify cost; 0 skips.
const MAX_PHOTOS = Math.max(0, Number(process.env.APIFY_MAX_IMAGES ?? 10));

// Pull the rich business facts out of a scraped place into the shared MapsData shape. Everything is
// optional — omit anything the scrape didn't return so demo-gen only ever sees real values.
function toMapsData(p: ApifyPlace): MapsData | null {
  const reviews = (p.reviews ?? [])
    .filter((r) => r?.text?.trim())
    .slice(0, MAX_REVIEWS)
    .map((r) => ({ text: r.text!.trim(), stars: r.stars ?? null, name: r.name ?? null }));
  const hours = (p.openingHours ?? [])
    .filter((h) => h?.day && h?.hours)
    .map((h) => `${h.day}: ${h.hours}`);
  const photos = (p.imageUrls ?? [])
    .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    .slice(0, MAX_PHOTOS);
  const data: MapsData = {
    rating: typeof p.totalScore === 'number' ? p.totalScore : null,
    reviewsCount: typeof p.reviewsCount === 'number' ? p.reviewsCount : null,
    reviews,
    hours,
    categories: p.categories ?? (p.categoryName ? [p.categoryName] : []),
    priceLevel: p.price ?? null,
    photos,
  };
  // Drop the whole blob if nothing useful was captured.
  const hasAny = data.rating != null || data.reviewsCount != null || reviews.length || hours.length || photos.length || (data.categories?.length ?? 0);
  return hasAny ? data : null;
}

// Stable id: prefer the actor's placeId, else the Google place_id embedded in its maps URL, else a
// name+address fallback so dedup/upsert still has a key.
function placeIdOf(p: ApifyPlace): string {
  if (p.placeId) return p.placeId;
  const m = p.url?.match(/query_place_id=([^&]+)/);
  if (m) return decodeURIComponent(m[1]);
  return `${p.title ?? ''}|${p.address ?? ''}`;
}

// website + phone come back with the search, so cache them per-id for enrichPlace to serve without a
// second network call. Module-level: searchBusinesses runs once per discovery pass, then enrichPlace is
// called per place within the same request; ids are unique so concurrent passes don't collide.
const enrichmentCache = new Map<string, PlaceEnrichment>();

export async function searchBusinessesApify(opts: {
  industry: string;
  city: string;
  maxResults?: number;
}): Promise<DiscoveredPlace[]> {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items?token=${token()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchStringsArray: [`${opts.industry} in ${opts.city}`],
        maxCrawledPlacesPerSearch: Math.min(opts.maxResults ?? 20, 20),
        language: 'en',
        skipClosedPlaces: true,
        maxReviews: MAX_REVIEWS, // real review texts for testimonials (0 = skip, saves cost)
        reviewsSort: REVIEWS_SORT, // pull the strongest/most-relevant reviews to curate from
        maxImages: MAX_PHOTOS, // real venue photos for the demo (0 = skip, saves cost)
      }),
      signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
    },
  );
  if (!res.ok) {
    throw new Error(`Apify run failed ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  }
  const items = (await res.json()) as ApifyPlace[];
  const out: DiscoveredPlace[] = [];
  for (const p of items) {
    if (p.permanentlyClosed || p.temporarilyClosed) continue; // match the Google client's OPERATIONAL-only filter
    const id = placeIdOf(p);
    enrichmentCache.set(id, { websiteUri: p.website ?? null, phone: p.phone ?? null });
    out.push({
      id,
      displayName: p.title ?? '',
      formattedAddress: p.address ?? '',
      lat: p.location?.lat ?? null,
      lng: p.location?.lng ?? null,
      businessStatus: 'OPERATIONAL',
      primaryType: p.categoryName ?? '',
      mapsData: toMapsData(p),
    });
  }
  return out;
}

// No network call: the scrape already carried website/phone; return what searchBusinessesApify cached.
export async function enrichPlaceApify(placeId: string): Promise<PlaceEnrichment> {
  return enrichmentCache.get(placeId) ?? { websiteUri: null, phone: null };
}
