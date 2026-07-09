import type { ScoreProfile, Redesign } from '../data/types';

// A synthetic audit for a GREENFIELD lead — a contactable business with NO current website (the exact
// target of the discovery website-gate). There is nothing to critique, and running Lighthouse/vision on a
// placeholder URL throws INVALID_URL, so instead we hand demo-gen a "build a first professional site"
// brief. Worker-safe (relative type import only, no `server-only`). The demo-gen research pass already
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
  const redesign: Redesign = {
    style: 'clean, warm and trustworthy — a first professional presence that reassures a new patient',
    sections: ['hero', 'services', 'about', 'reviews', 'hours & location', 'book'],
    cta: 'Book an appointment',
    content: 'warm, credible and reassuring; make the services + booking effortless for a first-time patient',
    template: 'first-website',
  };
  return {
    scores,
    problems: [
      'No website at all — invisible to the majority of clients who search online before choosing a provider.',
      'Reachable only by phone: no online services, hours, directions, or booking a first-time visitor can self-serve.',
      'Competitors with a real site capture the Google-search traffic and the trust a professional presence signals.',
    ],
    redesign,
    confidence: 88,
    summary: `${lead.company} has no website yet — new patients can only find them by phone. A first professional ${lead.industry} website with clear services, real patient reviews, hours + directions, and a one-tap booking path would turn Google-Maps discovery into booked appointments.`,
  };
}
