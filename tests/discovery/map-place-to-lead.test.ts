import { describe, it, expect } from 'vitest';

import { mapPlaceToLead } from '@/lib/discovery/map-place-to-lead';
import type { DiscoveredPlace, PlaceEnrichment } from '@/lib/discovery/places-client';
import type { SiteAssessment } from '@/lib/discovery/bad-website-heuristic';

// mapPlaceToLead turns a (Places place + enrichment + optional site assessment) into a `leads`
// insert object, filling in the same pipeline defaults the manual addLead path uses. These tests
// pin the exact field mapping, the constant defaults (score/value/agent/stage/demo), the
// assessment-driven `site`/`websiteScore` derivation, and the city-from-address parsing —
// including its fallbacks — so a behavior change here surfaces immediately.

function makePlace(over: Partial<DiscoveredPlace> = {}): DiscoveredPlace {
  return {
    id: 'ChIJ123',
    displayName: 'Acme Plumbing',
    formattedAddress: '123 Main St, Austin, TX 78701, USA',
    lat: 30.2672,
    lng: -97.7431,
    businessStatus: 'OPERATIONAL',
    primaryType: 'plumber',
    ...over,
  };
}

function makeEnrichment(over: Partial<PlaceEnrichment> = {}): PlaceEnrichment {
  return {
    websiteUri: 'https://acmeplumbing.example',
    phone: '+1 512-555-0100',
    ...over,
  };
}

function makeAssessment(over: Partial<SiteAssessment> = {}): SiteAssessment {
  return {
    reachable: true,
    score: 48,
    flags: ['no-viewport'],
    ...over,
  };
}

describe('mapPlaceToLead', () => {
  it('maps a fully-populated input to the expected leads insert object', () => {
    const result = mapPlaceToLead({
      place: makePlace(),
      enrichment: makeEnrichment(),
      assessment: makeAssessment(),
      email: 'sales@acmeplumbing.example',
      industry: 'Plumbing',
    });

    expect(result).toEqual({
      id: 'place-ChIJ123',
      company: 'Acme Plumbing',
      industry: 'Plumbing',
      city: 'Austin',
      url: 'https://acmeplumbing.example',
      site: 48,
      score: 84,
      value: 2400,
      agent: 'vega',
      stage: 'audited',
      demo: 'draft',
      placeId: 'ChIJ123',
      websiteUri: 'https://acmeplumbing.example',
      formattedAddress: '123 Main St, Austin, TX 78701, USA',
      lat: 30.2672,
      lng: -97.7431,
      businessStatus: 'OPERATIONAL',
      primaryType: 'plumber',
      email: 'sales@acmeplumbing.example',
      phone: '+1 512-555-0100',
      websiteScore: 48,
    });
  });

  it('derives id by prefixing placeId with "place-" and sets placeId to the raw id', () => {
    const result = mapPlaceToLead({
      place: makePlace({ id: 'XYZ-987' }),
      enrichment: makeEnrichment(),
      assessment: makeAssessment(),
      email: null,
      industry: 'Roofing',
    });
    expect(result.id).toBe('place-XYZ-987');
    expect(result.placeId).toBe('XYZ-987');
  });

  it('applies the constant pipeline defaults regardless of input', () => {
    const result = mapPlaceToLead({
      place: makePlace(),
      enrichment: makeEnrichment(),
      assessment: makeAssessment({ score: 5 }),
      email: null,
      industry: 'Dental',
    });
    expect(result.score).toBe(84);
    expect(result.value).toBe(2400);
    expect(result.agent).toBe('vega');
    expect(result.stage).toBe('audited');
    expect(result.demo).toBe('draft');
  });

  it('passes industry through unchanged', () => {
    const result = mapPlaceToLead({
      place: makePlace(),
      enrichment: makeEnrichment(),
      assessment: null,
      email: null,
      industry: 'HVAC & Heating',
    });
    expect(result.industry).toBe('HVAC & Heating');
  });

  describe('site / websiteScore derivation from assessment', () => {
    it('uses the assessment score for both site and websiteScore when assessed', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment(),
        assessment: makeAssessment({ score: 17 }),
        email: null,
        industry: 'Plumbing',
      });
      expect(result.site).toBe(17);
      expect(result.websiteScore).toBe(17);
    });

    it('falls back to site=38 and websiteScore=null when assessment is null', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.site).toBe(38);
      expect(result.websiteScore).toBeNull();
    });

    it('keeps a site score of 0 (does not coalesce 0 to the 38 default)', () => {
      // `assessment?.score ?? 38` only falls back on null/undefined, so a real 0 must survive.
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment(),
        assessment: makeAssessment({ score: 0 }),
        email: null,
        industry: 'Plumbing',
      });
      expect(result.site).toBe(0);
      expect(result.websiteScore).toBe(0);
    });
  });

  describe('url derivation from enrichment.websiteUri', () => {
    it('uses the website URI when present', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment({ websiteUri: 'https://x.example' }),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.url).toBe('https://x.example');
      expect(result.websiteUri).toBe('https://x.example');
    });

    it('falls back to "(no site yet)" for url but leaves websiteUri null when website is missing', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment({ websiteUri: null }),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.url).toBe('(no site yet)');
      expect(result.websiteUri).toBeNull();
    });
  });

  describe('company fallback', () => {
    it('falls back to "(unknown)" when displayName is empty', () => {
      const result = mapPlaceToLead({
        place: makePlace({ displayName: '' }),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.company).toBe('(unknown)');
    });
  });

  describe('city parsing from formattedAddress', () => {
    it('extracts the 2nd-from-last comma segment as the city', () => {
      // "123 Main St, Austin, TX 78701, USA" → 4 parts → parts[length-3] = "Austin"
      const result = mapPlaceToLead({
        place: makePlace({ formattedAddress: '123 Main St, Austin, TX 78701, USA' }),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.city).toBe('Austin');
    });

    it('trims whitespace around the extracted city segment', () => {
      const result = mapPlaceToLead({
        place: makePlace({ formattedAddress: '5 Elm Rd ,  Portland , OR 97201 , USA' }),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.city).toBe('Portland');
    });

    it('handles exactly 3 segments (length === 3 → first segment is the city)', () => {
      // "Austin, TX 78701, USA" → 3 parts → parts[0] = "Austin"
      const result = mapPlaceToLead({
        place: makePlace({ formattedAddress: 'Austin, TX 78701, USA' }),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.city).toBe('Austin');
    });

    it('falls back to the full address when there are fewer than 3 segments', () => {
      const result = mapPlaceToLead({
        place: makePlace({ formattedAddress: 'Austin, TX' }),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.city).toBe('Austin, TX');
    });

    it('falls back to "—" when the address is an empty string', () => {
      // 1 part of "" → length < 3 → fallback to formattedAddress ("") → `'' || '—'` → "—"
      const result = mapPlaceToLead({
        place: makePlace({ formattedAddress: '' }),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.city).toBe('—');
    });
  });

  describe('pass-through of place + enrichment fields', () => {
    it('carries through coordinates, status, type, phone, and email (incl. nulls)', () => {
      const result = mapPlaceToLead({
        place: makePlace({
          lat: null,
          lng: null,
          businessStatus: 'CLOSED_TEMPORARILY',
          primaryType: 'restaurant',
        }),
        enrichment: makeEnrichment({ phone: null }),
        assessment: null,
        email: null,
        industry: 'Food',
      });
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
      expect(result.businessStatus).toBe('CLOSED_TEMPORARILY');
      expect(result.primaryType).toBe('restaurant');
      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
      expect(result.formattedAddress).toBe('123 Main St, Austin, TX 78701, USA');
    });
  });
});
