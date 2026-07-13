import { describe, it, expect } from 'vitest';
import { greenfieldAudit } from '@/lib/audit/greenfield-audit';

// The synthetic audit handed to demo-gen for a contactable business with NO website. It runs with no
// external key at all, so its shape is the only guard against a regression in the greenfield path.
describe('greenfieldAudit', () => {
  const a = greenfieldAudit({ company: 'Healing Clinic', industry: 'acupuncture' });

  it('scores every dimension 0 (fully greenfield → max redesign upside)', () => {
    expect(Object.values(a.scores)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    // The 8 real dimensions are all present.
    expect(Object.keys(a.scores).sort()).toEqual(['content', 'conversion', 'cta', 'mobile', 'seo', 'speed', 'trust', 'visual']);
  });

  it('always marks the brief as a first website with sections + a CTA', () => {
    expect(a.redesign.template).toBe('first-website');
    expect(a.redesign.sections.length).toBeGreaterThan(0);
    expect(a.redesign.cta.length).toBeGreaterThan(0);
  });

  it('weaves the real company + industry into the summary (never a placeholder)', () => {
    expect(a.summary).toContain('Healing Clinic');
    expect(a.summary).toContain('acupuncture');
    expect(a.problems.length).toBeGreaterThan(0);
    expect(a.confidence).toBeGreaterThan(0);
  });

  it('fits the brief to the niche — a booking vertical books, a trade quotes', () => {
    const dental = greenfieldAudit({ company: 'Bright Smiles', industry: 'dental clinics' });
    expect(dental.redesign.cta).toBe('Book an appointment');
    expect(dental.redesign.template).toBe('first-website'); // greenfield marker survives the niche brief
    expect(dental.summary).toContain('Book an appointment');

    const plumber = greenfieldAudit({ company: 'RapidFlow Plumbing', industry: 'plumbers' });
    expect(plumber.redesign.cta).toBe('Get a free estimate'); // NOT the healthcare booking default
    expect(plumber.redesign.sections.join(' ')).toMatch(/estimate/i);
  });
});
