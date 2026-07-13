import type { Redesign } from '../data/types';

// A concrete redesign brief PER target niche. Both the website-audit path (buildAuditFor) and the greenfield
// path (greenfieldAudit) consult this, so the demo's structure/CTA/tone actually fits the business: a plumber
// gets "Get a free estimate", a law firm "Request a consultation", a gym "Start a free trial" — instead of the
// old bug where every one of the 14 MARKET_NICHES fell through to the healthcare "Book an appointment / Patient
// reviews / Insurance" default (the lowercase niche strings never matched the Title-Case category keys).
// Worker-safe: relative type-only import, no `server-only` — greenfieldAudit imports it under tsx.

const BRIEFS: Record<string, Redesign> = {
  // --- beauty / appointment ---
  'nail salons': { style: 'Fresh, colorful, portfolio-forward', sections: ['Gallery hero', 'Services & pricing', 'Nail-art lookbook', 'Reviews', 'Hours & location', 'Book an appointment'], cta: 'Book an appointment', content: 'Trendy, visual, local', template: 'Nail salon demo template' },
  'hair salons': { style: 'Stylish, editorial, aspirational', sections: ['Lookbook hero', 'Services & pricing', 'Stylist profiles', 'Reviews', 'Hours & location', 'Book an appointment'], cta: 'Book an appointment', content: 'Aspirational, on-trend, local', template: 'Hair salon demo template' },
  'med spas': { style: 'Spa-luxe, calm, premium', sections: ['Atmospheric hero', 'Treatment menu & pricing', 'Before & after', 'Reviews', 'Consultation booking'], cta: 'Book a consultation', content: 'Sensory, premium, results-led', template: 'Med spa demo template' },
  // --- clinical / patient (healthcare tone is correct HERE) ---
  'dental clinics': { style: 'Clean clinical-modern with warm trust cues', sections: ['Booking-first hero', 'Services with outcomes', 'Doctors & credentials', 'Patient reviews', 'Insurance & hours', 'Book an appointment'], cta: 'Book an appointment', content: 'Reassuring, outcome-led, local', template: 'Dental demo template' },
  dentists: { style: 'Clean clinical-modern with warm trust cues', sections: ['Booking-first hero', 'Services with outcomes', 'Doctors & credentials', 'Patient reviews', 'Insurance & hours', 'Book an appointment'], cta: 'Book an appointment', content: 'Reassuring, outcome-led, local', template: 'Dental demo template' },
  chiropractors: { style: 'Calm, recovery-focused, credible', sections: ['Conditions-we-treat hero', 'Treatments', 'Practitioner credentials', 'Patient results', 'Insurance & hours', 'Book an appointment'], cta: 'Book an appointment', content: 'Reassuring, recovery-led, local', template: 'Clinic demo template' },
  physiotherapists: { style: 'Calm, recovery-focused, credible', sections: ['Conditions-we-treat hero', 'Treatments', 'Practitioner credentials', 'Patient results', 'Insurance & hours', 'Book an appointment'], cta: 'Book an appointment', content: 'Reassuring, recovery-led, local', template: 'Clinic demo template' },
  'veterinary clinics': { style: 'Warm, friendly, trustworthy', sections: ['Warm hero', 'Services', 'Meet the vets', 'Pet-owner reviews', 'Hours & emergency', 'Book an appointment'], cta: 'Book an appointment', content: 'Warm, caring, local', template: 'Vet demo template' },
  // --- trades / quote & estimate ---
  'hvac contractors': { style: 'Bold, trust + fast-response', sections: ['Service hero', 'Services (repair / install / maintenance)', 'Service area', '24/7 emergency band', 'Reviews', 'Get a free estimate'], cta: 'Get a free estimate', content: 'Reliable, fast, local', template: 'Home-services demo template' },
  plumbers: { style: 'Bold, trust + fast-response', sections: ['Service hero', 'Services (repair / install / drains)', 'Service area', '24/7 emergency band', 'Reviews', 'Get a free estimate'], cta: 'Get a free estimate', content: 'Reliable, emergency-ready, local', template: 'Home-services demo template' },
  roofers: { style: 'Sturdy, proof-led, confident', sections: ['Project hero', 'Services (roofing / repair / inspection)', 'Recent-projects gallery', 'Service area', 'Reviews', 'Get a free estimate'], cta: 'Get a free estimate', content: 'Sturdy, proof-led, local', template: 'Home-services demo template' },
  // --- professional ---
  'law firms': { style: 'Authoritative, editorial, reassuring', sections: ['Practice-areas hero', 'Attorney profiles', 'Case results & testimonials', 'Our approach', 'Request a consultation'], cta: 'Request a consultation', content: 'Authoritative, credible, reassuring', template: 'Law firm demo template' },
  'real estate agents': { style: 'Aspirational, listing-led', sections: ['Search / listings hero', 'Featured listings', 'About the agent', 'Sold results', 'Neighborhood guide', 'Get a home valuation'], cta: 'Get a home valuation', content: 'Aspirational, local-expert, trustworthy', template: 'Real estate demo template' },
  // --- fitness ---
  gyms: { style: 'Energetic, bold, conversion-led', sections: ['Motion hero', 'Classes & memberships', 'Pricing', 'Trainer profiles', 'Member results', 'Start a free trial'], cta: 'Start a free trial', content: 'Motivating, direct, local', template: 'Gym demo template' },

  // --- legacy Title-Case categories (kept so the mock fixtures whose industry is a category still map) ---
  Healthcare: { style: 'Clean clinical-modern with warm trust cues', sections: ['Booking-first hero', 'Services with outcomes', 'Doctors & credentials', 'Patient reviews', 'Insurance & FAQ', 'One-tap contact'], cta: 'Book an appointment — sticky on mobile', content: 'Reassuring, outcome-led, local', template: 'Clinic demo template' },
  Wellness: { style: 'Editorial, calm, spa-luxe', sections: ['Atmospheric hero', 'Treatment menu', 'Pricing & packages', 'Therapist profiles', 'Gallery', 'Online booking'], cta: 'Book your session', content: 'Sensory, premium, unhurried', template: 'Spa demo template' },
  Hospitality: { style: 'Appetite-driven, vivid, mobile-first', sections: ['Photo hero', 'Live menu', 'Reservations', 'Reviews', 'Location & hours', 'Order online'], cta: 'Reserve a table', content: 'Mouth-watering, local, social', template: 'Restaurant demo template' },
  'Real Estate': { style: 'Aspirational, listing-led', sections: ['Search / listings hero', 'Featured listings', 'About the agent', 'Sold results', 'Neighborhood guide', 'Get a home valuation'], cta: 'Get a home valuation', content: 'Aspirational, local-expert, trustworthy', template: 'Real estate demo template' },
  Logistics: { style: 'Industrial-clean, trust & scale', sections: ['Capability hero', 'Services', 'Coverage map', 'Case results', 'Certifications', 'Quote request'], cta: 'Request a quote', content: 'Reliable, precise, B2B', template: 'Logistics demo template' },
  Fitness: { style: 'Energetic, bold, conversion-led', sections: ['Motion hero', 'Classes & plans', 'Pricing', 'Trainer profiles', 'Results', 'Free-trial CTA'], cta: 'Start a free trial', content: 'Motivating, direct, local', template: 'Gym demo template' },
};

// Niche-neutral fallback for an unknown industry — a generic LOCAL-SERVICE brief, NOT a clinical/patient one.
const NEUTRAL_DEFAULT: Redesign = {
  style: 'Clean, professional, local-first',
  sections: ['Hero', 'Services', 'Why choose us', 'Reviews', 'Service area & hours', 'Get in touch'],
  cta: 'Get in touch',
  content: 'Clear, trustworthy, local',
  template: 'Local business demo template',
};

export function nicheBrief(industry: string | null | undefined): Redesign {
  const raw = (industry ?? '').trim();
  return BRIEFS[raw] ?? BRIEFS[raw.toLowerCase()] ?? NEUTRAL_DEFAULT;
}

// The "what we'd change" bullets for the audit report — derived from the niche brief so they stay in lockstep
// with the tailored sections + CTA (a plumber's list talks estimates, a law firm's talks consultations).
export function nicheChanges(industry: string | null | undefined): string[] {
  const b = nicheBrief(industry);
  return [
    `${b.sections[0]} that loads instantly on mobile`,
    `Clear ${b.sections[1].toLowerCase()}`,
    'Real reviews + trust signals above the fold',
    `A sticky, one-tap "${b.cta}" call-to-action`,
  ];
}
