import { describe, it, expect } from 'vitest';
import { leadToDemoGenInput } from '@/lib/demo-gen/lead-to-input';
import { buildBuildPrompt } from '@/lib/demo-gen/prompt';
import type { leads, audits } from '@/lib/db/schema';

// The demo must NEVER invent a business fact: the real phone / address / Maps facts have to survive the
// leads-row → DemoGenInput mapping verbatim, and a fact we don't have must be OMITTED, not fabricated.
// This regressed once and shipped a made-up phone number — nothing but a test catches it. These tests are
// the guard for invariant O2.

const AUDIT = {
  leadId: 'lead-1',
  scores: { visual: 40, mobile: 55, cta: 30, trust: 70, seo: 80, speed: 25, content: 60, conversion: 35 },
  problems: ['Slow hero image', 'No mobile menu'],
  redesign: { style: 'Warm Clinical', sections: ['Hero', 'Services', 'Contact'], cta: 'Book an appointment', content: 'calm, trustworthy', template: 'first-website' },
  summary: 'A faster, mobile-first homepage.',
} as unknown as typeof audits.$inferSelect;

function makeLead(over: Partial<typeof leads.$inferSelect> = {}): typeof leads.$inferSelect {
  return {
    id: 'lead-1',
    company: 'Healing Clinic',
    industry: 'acupuncture',
    city: 'Garden Grove',
    url: '(no site yet)',
    formattedAddress: '9860 Garden Grove Blvd, Garden Grove, CA',
    phone: '(714) 591-5360',
    mapsData: null,
    ...over,
  } as unknown as typeof leads.$inferSelect;
}

describe('leadToDemoGenInput — the demo must never invent a business fact (O2)', () => {
  it('copies the real phone + address verbatim into the demo input', () => {
    const input = leadToDemoGenInput(makeLead(), AUDIT);
    expect(input.phone).toBe('(714) 591-5360');
    expect(input.address).toBe('9860 Garden Grove Blvd, Garden Grove, CA');
  });

  it('passes a null phone / address through untouched — no placeholder', () => {
    const input = leadToDemoGenInput(makeLead({ phone: null, formattedAddress: null }), AUDIT);
    expect(input.phone).toBeNull();
    expect(input.address).toBeNull();
  });

  it('the real phone + address reach the builder prompt verbatim', () => {
    const prompt = buildBuildPrompt(leadToDemoGenInput(makeLead(), AUDIT), 'SPEC', 'BRIEF');
    expect(prompt).toContain('(714) 591-5360');
    expect(prompt).toContain('9860 Garden Grove Blvd, Garden Grove, CA');
  });

  it('omits the phone entirely when there is no real phone (never fabricates one)', () => {
    const prompt = buildBuildPrompt(leadToDemoGenInput(makeLead({ phone: null }), AUDIT), 'SPEC', 'BRIEF');
    expect(prompt).not.toContain('(714)');
  });
});
