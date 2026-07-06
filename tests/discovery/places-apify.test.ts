import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchBusinessesApify, enrichPlaceApify } from '@/lib/discovery/places-apify';

// The Apify provider maps a Google-Maps-Scraper run into the app's DiscoveredPlace/PlaceEnrichment shape.
// The mocked payload mirrors the real actor output (title/address/phone/website/location/categoryName).

const realShape = [
  {
    placeId: 'ChIJabc',
    title: 'Australian Dental Clinic Danang',
    address: '51 Đ. 2 Tháng 9, Đà Nẵng, Vietnam',
    phone: '+84 906 200 434',
    website: 'https://www.australiandentalclinic.vn/',
    categoryName: 'Dental clinic',
    location: { lat: 16.03, lng: 108.22 },
    url: 'https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJabc',
    permanentlyClosed: false,
    temporarilyClosed: false,
  },
  // no placeId → id derived from the url's query_place_id
  { title: 'Smile Dental', address: '2 Hai Phong', website: 'http://smile.vn', location: { lat: 16.06, lng: 108.2 }, categoryName: 'Dentist', url: 'https://maps.google.com/?query_place_id=ChIJxyz' },
  // closed → filtered out
  { placeId: 'ChIJclosed', title: 'Closed Dental', address: 'nowhere', permanentlyClosed: true },
];

function mockFetch(payload: unknown, ok = true, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => { process.env.APIFY_API_TOKEN = 'apify_api_test'; });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.APIFY_API_TOKEN; });

describe('searchBusinessesApify', () => {
  it('maps scraped places to DiscoveredPlace and drops closed ones', async () => {
    mockFetch(realShape);
    const out = await searchBusinessesApify({ industry: 'dentists', city: 'Da Nang' });
    expect(out).toHaveLength(2); // the permanently-closed one is filtered
    expect(out[0]).toEqual({
      id: 'ChIJabc',
      displayName: 'Australian Dental Clinic Danang',
      formattedAddress: '51 Đ. 2 Tháng 9, Đà Nẵng, Vietnam',
      lat: 16.03,
      lng: 108.22,
      businessStatus: 'OPERATIONAL',
      primaryType: 'Dental clinic',
      // categoryName seeds categories even with no rating/reviews scraped.
      mapsData: { rating: null, reviewsCount: null, reviews: [], hours: [], categories: ['Dental clinic'], priceLevel: null },
    });
  });

  it('derives id from the maps url when placeId is absent', async () => {
    mockFetch(realShape);
    const out = await searchBusinessesApify({ industry: 'dentists', city: 'Da Nang' });
    expect(out[1].id).toBe('ChIJxyz');
  });

  it('sends the search query and caps the result count at 20', async () => {
    const fn = mockFetch([]);
    await searchBusinessesApify({ industry: 'cafes', city: 'Hanoi', maxResults: 100 });
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.searchStringsArray).toEqual(['cafes in Hanoi']);
    expect(body.maxCrawledPlacesPerSearch).toBe(20);
    // token goes in the URL, not logged in the body
    expect(String(fn.mock.calls[0][0])).toContain('run-sync-get-dataset-items');
  });

  it('throws a clear error when the token is missing', async () => {
    delete process.env.APIFY_API_TOKEN;
    mockFetch([]);
    await expect(searchBusinessesApify({ industry: 'x', city: 'y' })).rejects.toThrow(/APIFY_API_TOKEN/);
  });

  it('throws on a non-ok Apify response', async () => {
    mockFetch({ error: 'nope' }, false, 402);
    await expect(searchBusinessesApify({ industry: 'x', city: 'y' })).rejects.toThrow(/Apify run failed 402/);
  });
});

describe('enrichPlaceApify', () => {
  it('serves website/phone cached by the preceding search — no second call', async () => {
    mockFetch(realShape);
    await searchBusinessesApify({ industry: 'dentists', city: 'Da Nang' });
    expect(await enrichPlaceApify('ChIJabc')).toEqual({
      websiteUri: 'https://www.australiandentalclinic.vn/',
      phone: '+84 906 200 434',
    });
    // a place with no phone still resolves (null phone)
    expect(await enrichPlaceApify('ChIJxyz')).toEqual({ websiteUri: 'http://smile.vn', phone: null });
  });

  it('returns nulls for an unknown id', async () => {
    expect(await enrichPlaceApify('does-not-exist')).toEqual({ websiteUri: null, phone: null });
  });
});

describe('searchBusinessesApify — rich Maps facts (mapsData)', () => {
  const rich = [
    {
      placeId: 'ChIJrich',
      title: 'Bloom Nails',
      address: '10 Main St, Austin, TX, USA',
      categoryName: 'Nail salon',
      location: { lat: 30.2, lng: -97.7 },
      totalScore: 4.7,
      reviewsCount: 213,
      reviews: [
        { text: 'Best manicure in Austin, spotless studio.', stars: 5, name: 'Jenna' },
        { text: '  ', stars: 4, name: 'Blank' }, // blank text → dropped
      ],
      openingHours: [
        { day: 'Monday', hours: '9 AM to 7 PM' },
        { day: 'Sunday', hours: 'Closed' },
      ],
      categories: ['Nail salon', 'Spa'],
      price: '$$',
    },
  ];

  it('captures rating/reviews/hours/categories/price into place.mapsData', async () => {
    mockFetch(rich);
    const [place] = await searchBusinessesApify({ industry: 'nail salon', city: 'Austin TX' });
    expect(place.mapsData).toEqual({
      rating: 4.7,
      reviewsCount: 213,
      reviews: [{ text: 'Best manicure in Austin, spotless studio.', stars: 5, name: 'Jenna' }],
      hours: ['Monday: 9 AM to 7 PM', 'Sunday: Closed'],
      categories: ['Nail salon', 'Spa'],
      priceLevel: '$$',
    });
  });

  it('leaves mapsData null when the scrape carries no rich facts', async () => {
    mockFetch([{ placeId: 'ChIJbare', title: 'Bare Co', address: 'x', location: { lat: 1, lng: 2 } }]);
    const [place] = await searchBusinessesApify({ industry: 'x', city: 'y' });
    expect(place.mapsData).toBeNull();
  });
});
