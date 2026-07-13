import { describe, it, expect } from 'vitest';

import { mapPlaceToLead } from '@/lib/discovery/map-place-to-lead';
import type { DiscoveredPlace, PlaceEnrichment } from '@/lib/discovery/places-client';
import type { SiteAssessment } from '@/lib/discovery/bad-website-heuristic';

// mapPlaceToLead turns a (Places place + enrichment + optional site assessment) into a `leads`
// insert object, filling in the same pipeline defaults the manual addLead path uses. These tests
// pin the exact field mapping, the pre-audit defaults (value/agent=orion/stage=found/demo) + derived score, the
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
      score: 48,
      value: 0,
      agent: 'orion',
      stage: 'found',
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
      mapsData: null,
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

  it('applies the pipeline defaults (orion-owned, pre-audit) regardless of input', () => {
    const result = mapPlaceToLead({
      place: makePlace(),
      enrichment: makeEnrichment(),
      assessment: makeAssessment({ score: 5 }),
      email: null,
      industry: 'Dental',
    });
    // score mirrors the real heuristic site score (no fabricated projection); value is 0 without a qualifier.
    expect(result.score).toBe(5);
    expect(result.value).toBe(0);
    expect(result.agent).toBe('orion');
    expect(result.stage).toBe('found');
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

    it('falls back to site=0 and websiteScore=null when assessment is null', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment(),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.site).toBe(0);
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

    // The auto-hunter pipelines social-only and dead-site leads as "no real website" — so `url` (the audit's
    // greenfield signal) must be the placeholder, while `websiteUri` keeps the raw value for display/dedup.
    it('treats a social-only link as greenfield url but keeps the raw websiteUri', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment({ websiteUri: 'https://facebook.com/acmeplumbing' }),
        assessment: makeAssessment({ reachable: true }),
        email: null,
        industry: 'Plumbing',
      });
      expect(result.url).toBe('(no site yet)');
      expect(result.websiteUri).toBe('https://facebook.com/acmeplumbing');
    });

    it('treats an assessed-unreachable site as greenfield url but keeps the raw websiteUri', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment({ websiteUri: 'https://dead-site.example' }),
        assessment: makeAssessment({ reachable: false }),
        email: null,
        industry: 'Plumbing',
      });
      expect(result.url).toBe('(no site yet)');
      expect(result.websiteUri).toBe('https://dead-site.example');
    });

    it('keeps a present, non-social site that was not assessed (does not force greenfield)', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment({ websiteUri: 'https://real-site.example' }),
        assessment: null,
        email: null,
        industry: 'Plumbing',
      });
      expect(result.url).toBe('https://real-site.example');
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

  describe('orion qualification + derived score', () => {
    it('uses the qualified value when Orion provides one (instead of the $2,400 default)', () => {
      const result = mapPlaceToLead({
        place: makePlace(),
        enrichment: makeEnrichment(),
        assessment: makeAssessment({ score: 30 }),
        email: null,
        industry: 'Plumbing',
        qualified: { value: 5200 },
      });
      expect(result.value).toBe(5200);
      expect(result.agent).toBe('orion');
      expect(result.stage).toBe('found');
    });

    it('sets score to the real heuristic site score (0 when not assessed; no fabricated projection)', () => {
      const low = mapPlaceToLead({ place: makePlace(), enrichment: makeEnrichment(), assessment: makeAssessment({ score: 10 }), email: null, industry: 'Plumbing' });
      expect(low.score).toBe(10);
      const noSite = mapPlaceToLead({ place: makePlace(), enrichment: makeEnrichment(), assessment: null, email: null, industry: 'Plumbing' });
      expect(noSite.score).toBe(0);
      const high = mapPlaceToLead({ place: makePlace(), enrichment: makeEnrichment(), assessment: makeAssessment({ score: 90 }), email: null, industry: 'Plumbing' });
      expect(high.score).toBe(90);
    });
  });
});
