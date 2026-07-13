import { describe, it, expect } from 'vitest';
import { nicheBrief, nicheChanges } from '@/lib/discovery/niche-briefs';
import { MARKET_NICHES } from '@/lib/discovery/market-catalog';

// The whole point of the catalog: every target niche gets a redesign brief that FITS it, instead of all 14
// discovery niches falling through to the healthcare "Book an appointment" default (the old bug).
describe('nicheBrief', () => {
  const neutral = nicheBrief('some-industry-with-no-brief');

  it('gives a neutral local-service default (not clinical) for an unknown industry', () => {
    expect(neutral.cta).toBe('Get in touch');
    expect(neutral.template).toBe('Local business demo template');
  });

  it('gives every one of the 14 discovery niches its own tailored, non-default brief', () => {
    for (const niche of MARKET_NICHES) {
      const b = nicheBrief(niche);
      expect(b.template, `${niche} should not fall to the neutral default`).not.toBe(neutral.template);
      expect(b.sections.length).toBeGreaterThan(0);
      expect(b.cta.length).toBeGreaterThan(0);
    }
  });

  it('matches the niche key case-insensitively', () => {
    expect(nicheBrief('Plumbers')).toEqual(nicheBrief('plumbers'));
    expect(nicheBrief('  Nail Salons  '.toLowerCase().trim())).toEqual(nicheBrief('nail salons'));
  });

  it('picks a CTA that matches the vertical\'s real conversion, not a generic booking', () => {
    expect(nicheBrief('plumbers').cta).toBe('Get a free estimate');
    expect(nicheBrief('roofers').cta).toBe('Get a free estimate');
    expect(nicheBrief('hvac contractors').cta).toBe('Get a free estimate');
    expect(nicheBrief('law firms').cta).toBe('Request a consultation');
    expect(nicheBrief('real estate agents').cta).toBe('Get a home valuation');
    expect(nicheBrief('gyms').cta).toBe('Start a free trial');
    // Appointment verticals legitimately book — but a med spa consults, not books, so pin its distinct CTA
    // (the loop above only checks non-emptiness, so a silent regression to 'Book an appointment' would pass).
    expect(nicheBrief('med spas').cta).toBe('Book a consultation');
    expect(nicheBrief('dental clinics').cta).toBe('Book an appointment');
    expect(nicheBrief('nail salons').cta).toBe('Book an appointment');
  });

  it('handles null/undefined industry as the neutral default', () => {
    expect(nicheBrief(null)).toEqual(neutral);
    expect(nicheBrief(undefined)).toEqual(neutral);
  });
});

describe('nicheChanges', () => {
  it('derives change bullets that echo the niche CTA', () => {
    const plumber = nicheChanges('plumbers');
    expect(plumber.length).toBe(4);
    expect(plumber.some((c) => c.includes('Get a free estimate'))).toBe(true);

    const law = nicheChanges('law firms');
    expect(law.some((c) => c.includes('Request a consultation'))).toBe(true);
  });
});
