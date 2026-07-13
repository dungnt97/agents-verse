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

  it('produces a "first-website" redesign brief with the required sections + a booking CTA', () => {
    expect(a.redesign.template).toBe('first-website');
    expect(a.redesign.sections).toContain('hero');
    expect(a.redesign.sections).toContain('book');
    expect(a.redesign.cta.length).toBeGreaterThan(0);
  });

  it('weaves the real company + industry into the summary (never a placeholder)', () => {
    expect(a.summary).toContain('Healing Clinic');
    expect(a.summary).toContain('acupuncture');
    expect(a.problems.length).toBeGreaterThan(0);
    expect(a.confidence).toBeGreaterThan(0);
  });
});
