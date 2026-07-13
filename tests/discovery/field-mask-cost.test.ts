import { describe, it, expect } from 'vitest';
import { DISCOVERY_FIELD_MASK, ENRICH_FIELD_MASK } from '@/lib/discovery/places-client';

// M1 — the money invariant. The Google Places discovery (search) call is billed by its field mask: any
// Enterprise-SKU field in it makes EVERY search bill at ~$7/1k instead of ~$2.50/1k. This pins the boundary
// so the cost regression can't slip in silently (it is otherwise enforced by nothing).
const ENTERPRISE_FIELDS = ['websiteUri', 'phone', 'internationalPhoneNumber', 'nationalPhoneNumber', 'rating', 'userRatingCount', 'reviews', 'regularOpeningHours', 'priceLevel', 'photos'];

describe('DISCOVERY_FIELD_MASK cost boundary (M1)', () => {
  it('contains ONLY the cheap Pro-SKU search fields', () => {
    expect(DISCOVERY_FIELD_MASK.split(',').sort()).toEqual(
      ['places.businessStatus', 'places.displayName', 'places.formattedAddress', 'places.id', 'places.location', 'places.primaryType'].sort(),
    );
  });

  it('contains NO Enterprise-SKU field (which would triple the per-search bill)', () => {
    for (const f of ENTERPRISE_FIELDS) expect(DISCOVERY_FIELD_MASK).not.toContain(f);
  });

  it('keeps the Enterprise fields in the enrichment mask (used only for the top-N)', () => {
    expect(ENRICH_FIELD_MASK).toContain('websiteUri');
  });
});
