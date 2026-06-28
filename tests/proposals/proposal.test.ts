import { describe, it, expect } from 'vitest';
import { buildProposal } from '@/lib/proposals/proposal';
import type { Deal } from '@/lib/data/types';

const deal = (over: Partial<Deal> = {}): Deal => ({
  id: 'd1', leadId: 'l1', client: 'Highlands Coffee', industry: 'Coffee', city: 'HCMC',
  pkg: 'Business Website', price: 2400, value: 3000, probability: 70, stage: 'quoted',
  escReason: null, aiRec: '', conf: 80, reply: {} as Deal['reply'], production: null, ...over,
});

describe('buildProposal', () => {
  it('builds a one-time proposal from the negotiated price', () => {
    const p = buildProposal(deal());
    expect(p.ref).toBe('PRO-D1');
    expect(p.agency).toBe('Agents Verse');
    expect(p.lines).toHaveLength(1);
    expect(p.lines[0].amount).toBe(2400);
    expect(p.subtotal).toBe(2400);
    expect(p.total).toBe(2400);
    expect(p.monthly).toBeNull();
    expect(p.scope.length).toBeGreaterThan(3);
    expect(p.terms.length).toBeGreaterThan(2);
  });
  it('falls back to pricing.businessWebsite, then value, then 0 when price is 0', () => {
    expect(buildProposal(deal({ price: 0 }), { businessWebsite: 2000 }).total).toBe(2000);
    expect(buildProposal(deal({ price: 0 }), null).total).toBe(3000);
    expect(buildProposal(deal({ price: 0, value: 0 }), null).total).toBe(0);
  });
  it('adds monthly care + extra scope/terms only when pricing offers it', () => {
    const p = buildProposal(deal(), { monthlyGrowthCare: 240 });
    expect(p.monthly).toBe(240);
    expect(p.scope.some((s) => s.toLowerCase().includes('monthly'))).toBe(true);
    expect(p.terms.some((t) => t.toLowerCase().includes('monthly'))).toBe(true);
    // a zero/negative monthly is ignored
    expect(buildProposal(deal(), { monthlyGrowthCare: 0 }).monthly).toBeNull();
  });
  it('uses the package name as the line label, with a fallback when empty', () => {
    expect(buildProposal(deal({ pkg: '' })).lines[0].label).toBe('Website redesign');
    expect(buildProposal(deal({ pkg: 'Landing Page' })).lines[0].label).toBe('Landing Page');
  });
});
