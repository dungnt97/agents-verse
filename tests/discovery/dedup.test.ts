import { describe, it, expect } from 'vitest';

import { normalizeName, isLikelyDuplicate, dedupePlaces } from '@/lib/discovery/dedup';
import type { DiscoveredPlace } from '@/lib/discovery/places-client';

// Minimal in-memory factory for DiscoveredPlace. Only id/displayName/formattedAddress matter to
// the dedup logic; the rest are filled with inert values so the type is satisfied.
function place(overrides: Partial<DiscoveredPlace> & Pick<DiscoveredPlace, 'id'>): DiscoveredPlace {
  return {
    id: overrides.id,
    displayName: overrides.displayName ?? '',
    formattedAddress: overrides.formattedAddress ?? '',
    lat: overrides.lat ?? null,
    lng: overrides.lng ?? null,
    businessStatus: overrides.businessStatus ?? 'OPERATIONAL',
    primaryType: overrides.primaryType ?? '',
  };
}

describe('normalizeName', () => {
  it('lowercases and trims surrounding whitespace', () => {
    expect(normalizeName('  Acme Bakery  ')).toBe('acme bakery');
    expect(normalizeName('ACME BAKERY')).toBe('acme bakery');
  });

  it('collapses runs of punctuation/whitespace into single spaces', () => {
    // "&", "  " (double space) and "-" are all non-[a-z0-9] → each run becomes one space.
    expect(normalizeName('Smith   &   Sons')).toBe('smith sons');
    expect(normalizeName('Foo-Bar')).toBe('foo bar');
  });

  it('strips diacritics by dropping non-ASCII letters (does NOT transliterate)', () => {
    // é is not in [a-z0-9], so the whole "café" run becomes "caf" + space, NOT "cafe".
    expect(normalizeName('Café')).toBe('caf');
    expect(normalizeName('Crème Brûlée')).toBe('cr me br l e');
  });

  it('removes legal/common suffix words: inc, llc, ltd, co, corp, the', () => {
    expect(normalizeName('Acme Inc')).toBe('acme');
    expect(normalizeName('Acme LLC')).toBe('acme');
    expect(normalizeName('Acme Ltd')).toBe('acme');
    expect(normalizeName('Acme Corp')).toBe('acme');
    // "The" as a leading word is removed; trim cleans the leading space it leaves behind.
    expect(normalizeName('The Acme')).toBe('acme');
  });

  it('only removes suffix words when they are whole word-boundary tokens', () => {
    // "Income" contains "inc" but \binc\b should not match inside it.
    expect(normalizeName('Income Partners')).toBe('income partners');
    // "Theory" contains "the" but must not be stripped.
    expect(normalizeName('Theory Lab')).toBe('theory lab');
    // "Cocoa" contains "co" but must not be stripped.
    expect(normalizeName('Cocoa Co')).toBe('cocoa');
  });

  it('matches the canonical example "Joe\'s Café, Inc." exactly', () => {
    // lower → "joe's café, inc."
    // non-alnum runs → "joe s caf inc "
    // strip "inc"     → "joe s caf  " (suffix-strip does NOT collapse the gap it leaves)
    // trim            → "joe s caf"
    expect(normalizeName("Joe's Café, Inc.")).toBe('joe s caf');
  });

  it('leaves internal double-spaces when a stripped word sat between tokens (no re-collapse)', () => {
    // "inc" removal between "apple" and "store" leaves a double space, untouched by trim.
    expect(normalizeName('Apple Inc Store')).toBe('apple  store');
  });

  it('handles empty and all-punctuation input', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName('   ')).toBe('');
    expect(normalizeName('!!!')).toBe('');
  });
});

describe('isLikelyDuplicate', () => {
  it('returns true immediately when ids are identical regardless of name/address', () => {
    const a = place({ id: 'same', displayName: 'Totally Different Name', formattedAddress: 'X Road' });
    const b = place({ id: 'same', displayName: 'Nothing Alike Here', formattedAddress: 'Y Avenue' });
    expect(isLikelyDuplicate(a, b)).toBe(true);
  });

  it('returns true for near-identical names + addresses', () => {
    // "Acme Bakery" and "Acme Bakery Inc" both normalize to tokens {acme,bakery} (suffix "inc"
    // stripped) → name jaccard 1.0; "St" vs "Street" still share {12,main,springfield} → addr >= 0.5.
    const a = place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' });
    const b = place({ id: '2', displayName: 'Acme Bakery Inc', formattedAddress: '12 Main Street, Springfield' });
    expect(isLikelyDuplicate(a, b)).toBe(true);
  });

  it('returns false for clearly different businesses', () => {
    const a = place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' });
    const b = place({ id: '2', displayName: 'Pizza Palace', formattedAddress: '900 Ocean Blvd, Miami' });
    expect(isLikelyDuplicate(a, b)).toBe(false);
  });

  it('requires BOTH name >= threshold AND address similarity >= 0.5', () => {
    // Identical name, totally different address → not a duplicate (address gate fails).
    const a = place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' });
    const b = place({ id: '2', displayName: 'Acme Bakery', formattedAddress: '999 Pine Ave, Portland' });
    expect(isLikelyDuplicate(a, b)).toBe(false);

    // Identical address, totally different name → not a duplicate (name gate fails).
    const c = place({ id: '3', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' });
    const d = place({ id: '4', displayName: 'Zenith Garage', formattedAddress: '12 Main St, Springfield' });
    expect(isLikelyDuplicate(c, d)).toBe(false);
  });

  it('honors the default threshold of 0.8 at the name boundary', () => {
    // Names: {alpha,beta,gamma,delta} vs {alpha,beta,gamma,omega}
    // jaccard = 3 intersection / 5 union = 0.6 → below default 0.8 → not duplicate.
    const a = place({ id: '1', displayName: 'Alpha Beta Gamma Delta', formattedAddress: '1 Main St' });
    const b = place({ id: '2', displayName: 'Alpha Beta Gamma Omega', formattedAddress: '1 Main St' });
    expect(isLikelyDuplicate(a, b)).toBe(false); // 0.6 < 0.8 (default)
  });

  it('an explicit lower threshold flips the same pair to a duplicate', () => {
    const a = place({ id: '1', displayName: 'Alpha Beta Gamma Delta', formattedAddress: '1 Main St' });
    const b = place({ id: '2', displayName: 'Alpha Beta Gamma Omega', formattedAddress: '1 Main St' });
    // name jaccard 0.6 now clears an explicit 0.5 threshold; address identical (1.0) clears 0.5.
    expect(isLikelyDuplicate(a, b, 0.5)).toBe(true);
    // And a stricter threshold still rejects.
    expect(isLikelyDuplicate(a, b, 0.7)).toBe(false);
  });

  it('treats a threshold of exactly the similarity as a match (>= comparison)', () => {
    // 3/4 = 0.75 name jaccard: {a,b,c,d} vs {a,b,c} → intersection 3, union 4.
    const a = place({ id: '1', displayName: 'Apple Banana Cherry Date', formattedAddress: '5 Oak Rd' });
    const b = place({ id: '2', displayName: 'Apple Banana Cherry', formattedAddress: '5 Oak Rd' });
    expect(isLikelyDuplicate(a, b, 0.75)).toBe(true); // boundary inclusive
    expect(isLikelyDuplicate(a, b, 0.76)).toBe(false);
  });

  it('returns false when a name is empty (zero token set yields 0 similarity)', () => {
    const a = place({ id: '1', displayName: '', formattedAddress: '12 Main St' });
    const b = place({ id: '2', displayName: '', formattedAddress: '12 Main St' });
    // Both empty → jaccard short-circuits to 0 → below any positive threshold.
    expect(isLikelyDuplicate(a, b)).toBe(false);
  });
});

describe('dedupePlaces', () => {
  it('returns an empty array for empty input', () => {
    expect(dedupePlaces([])).toEqual([]);
  });

  it('preserves all entries when every place is distinct', () => {
    const input = [
      place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' }),
      place({ id: '2', displayName: 'Pizza Palace', formattedAddress: '900 Ocean Blvd, Miami' }),
      place({ id: '3', displayName: 'Zenith Garage', formattedAddress: '5 Pine Ave, Portland' }),
    ];
    const out = dedupePlaces(input);
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.id)).toEqual(['1', '2', '3']);
  });

  it('removes near-duplicates and keeps the FIRST occurrence as representative', () => {
    const input = [
      place({ id: 'first', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' }),
      place({ id: 'dup', displayName: 'Acme Bakery Inc', formattedAddress: '12 Main Street, Springfield' }),
      place({ id: 'other', displayName: 'Pizza Palace', formattedAddress: '900 Ocean Blvd, Miami' }),
    ];
    const out = dedupePlaces(input);
    expect(out).toHaveLength(2);
    // The first-seen duplicate is kept; the later one is dropped.
    expect(out.map((p) => p.id)).toEqual(['first', 'other']);
  });

  it('dedupes places that share the same id even if name/address differ', () => {
    const input = [
      place({ id: 'X', displayName: 'Name A', formattedAddress: 'Addr A' }),
      place({ id: 'X', displayName: 'Name B', formattedAddress: 'Addr B' }),
    ];
    const out = dedupePlaces(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('X');
    expect(out[0].displayName).toBe('Name A'); // first representative retained
  });

  it('collapses a run of three mutual near-duplicates into one', () => {
    const input = [
      place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St, Springfield' }),
      place({ id: '2', displayName: 'Acme Bakery Inc', formattedAddress: '12 Main Street, Springfield' }),
      place({ id: '3', displayName: 'The Acme Bakery', formattedAddress: '12 Main St, Springfield IL' }),
    ];
    const out = dedupePlaces(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('1');
  });

  it('does not mutate the input array', () => {
    const input = [
      place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St' }),
      place({ id: '1', displayName: 'Acme Bakery', formattedAddress: '12 Main St' }),
    ];
    const snapshot = input.length;
    dedupePlaces(input);
    expect(input).toHaveLength(snapshot); // original untouched
  });
});
