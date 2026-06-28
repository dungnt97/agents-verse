// Pure proposal/quote builder — turns a won/quoted Deal + the founder pricing settings into a structured
// proposal document the UI renders (and the founder prints to PDF). No I/O, no browser. tsx-safe.
import type { Deal } from '@/lib/data/types';

export interface ProposalLine {
  label: string;
  detail: string;
  amount: number;
}

export interface ProposalDoc {
  ref: string;
  agency: string;
  client: string;
  industry: string;
  city: string;
  package: string;
  lines: ProposalLine[];
  subtotal: number;
  total: number;
  /** Ongoing care billed monthly (separate from the one-time total), or null when not offered. */
  monthly: number | null;
  scope: string[];
  terms: string[];
}

// Pricing fields are a jsonb blob on the settings row; read defensively.
export interface ProposalPricing {
  landingPage?: number;
  businessWebsite?: number;
  monthlyGrowthCare?: number;
}

const pos = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

export function buildProposal(deal: Deal, pricing?: ProposalPricing | null): ProposalDoc {
  // Headline one-time price: the negotiated quote when present, else the package list price, else the
  // deal's estimated value — never a fabricated number.
  const oneTime = pos(deal.price) ?? pos(pricing?.businessWebsite) ?? pos(deal.value) ?? 0;
  const monthly = pos(pricing?.monthlyGrowthCare);

  const lines: ProposalLine[] = [
    { label: deal.pkg || 'Website redesign', detail: `Custom redesign + production build for ${deal.client}`, amount: oneTime },
  ];
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  const scope = [
    'Bespoke homepage redesign tailored to your brand',
    'Fully responsive — desktop, tablet and mobile',
    'Conversion-focused layout with clear calls to action',
    'On-page SEO + social-share metadata',
    'Copywriting in your brand voice',
    'One round of revisions before launch',
    'Production build + deployment',
  ];
  if (monthly) scope.push('Ongoing monthly care — updates, monitoring and small changes');

  const terms = [
    '50% deposit to start, 50% on delivery.',
    'Estimated delivery: 5–7 business days from kickoff and assets.',
    'All amounts in USD. This proposal is valid for 14 days.',
  ];
  if (monthly) terms.push('Monthly care is billed separately and can be cancelled any time.');

  return {
    ref: 'PRO-' + deal.id.toUpperCase(),
    agency: 'Agents Verse',
    client: deal.client,
    industry: deal.industry,
    city: deal.city,
    package: deal.pkg,
    lines,
    subtotal,
    total: subtotal,
    monthly,
    scope,
    terms,
  };
}
