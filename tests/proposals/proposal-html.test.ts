import { describe, it, expect } from 'vitest';
import { buildProposal } from '@/lib/proposals/proposal';
import { buildProposalHtml } from '@/lib/proposals/proposal-html';
import type { Deal } from '@/lib/data/types';

const deal = (over: Partial<Deal> = {}): Deal => ({
  id: 'd1', leadId: 'l1', client: 'Highlands Coffee', industry: 'Coffee', city: 'HCMC',
  pkg: 'Business Website', price: 2400, value: 3000, probability: 70, stage: 'quoted',
  escReason: null, aiRec: '', conf: 80, reply: {} as Deal['reply'], production: null, ...over,
});

describe('buildProposalHtml', () => {
  it('renders a complete, self-contained HTML document with the proposal values', () => {
    const html = buildProposalHtml(buildProposal(deal(), { monthlyGrowthCare: 240 }), '2026-06-29');
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('lang="en"');
    expect(html).toContain('PRO-D1');
    expect(html).toContain('Highlands Coffee');
    expect(html).toContain('$2,400');
    expect(html).toContain('Total (one-time)');
    expect(html).toContain('$240 / month ongoing care');
    expect(html).toContain('Web design proposal');
    expect(html).toContain('2026-06-29');
  });
  it('omits the monthly line when there is no ongoing care', () => {
    const html = buildProposalHtml(buildProposal(deal()), '2026-06-29');
    expect(html).not.toContain('/ month ongoing care');
  });
  it('escapes HTML-unsafe characters in deal-supplied values', () => {
    const html = buildProposalHtml(buildProposal(deal({ client: 'A & B <script>' })), '2026-06-29');
    expect(html).toContain('A &amp; B &lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
