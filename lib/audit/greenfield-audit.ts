import type { ScoreProfile, Redesign } from '../data/types';
import { nicheBrief } from '../discovery/niche-briefs';

// A synthetic audit for a GREENFIELD lead — a contactable business with NO current website (the exact
// target of the discovery website-gate). There is nothing to critique, and running Lighthouse/vision on a
// placeholder URL throws INVALID_URL, so instead we hand demo-gen a "build a first professional site"
// brief. Worker-safe (relative imports only, no `server-only`). The demo-gen research pass already
// handles the missing current-site screenshot by designing from the real venue photos + the niche.
export interface GreenfieldAudit {
  scores: ScoreProfile;
  problems: string[];
  redesign: Redesign;
  confidence: number;
  summary: string;
}

export function greenfieldAudit(lead: { company: string; industry: string }): GreenfieldAudit {
  // No site → nothing scores; zeros mark it as fully greenfield (site quality 0, max redesign upside).
  const scores: ScoreProfile = { visual: 0, mobile: 0, cta: 0, trust: 0, seo: 0, speed: 0, content: 0, conversion: 0 };
  // Structure/CTA/tone come from the per-niche brief so a first-time plumber site sells "Get a free estimate"
  // and a law firm "Request a consultation" — not the generic patient-booking default. `template` stays
  // 'first-website' as the greenfield marker (demo-gen designs a first presence, not a redesign of an old one).
  const brief = nicheBrief(lead.industry);
  const redesign: Redesign = { ...brief, template: 'first-website' };
  return {
    scores,
    problems: [
      'No website at all — invisible to the majority of customers who search online before choosing where to go.',
      'Reachable only by phone: no online services, hours, directions, or a way for a first-time visitor to self-serve.',
      'Competitors with a real site capture the Google-search traffic and the trust a professional presence signals.',
    ],
    redesign,
    confidence: 88,
    summary: `${lead.company} has no website yet — customers can only reach them by phone. A first professional ${lead.industry} website with clear services, real reviews, hours + directions, and a one-tap “${brief.cta}” path would turn Google-Maps discovery into new customers.`,
  };
}
