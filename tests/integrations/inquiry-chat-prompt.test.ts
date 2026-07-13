import { describe, it, expect } from 'vitest';
import { buildInquirySystemPrompt } from '@/lib/integrations/inquiry-chat-prompt';

describe('buildInquirySystemPrompt', () => {
  const ctx = { company: 'Ruve Nail Spa', industry: 'nail salon', city: 'Austin TX', language: 'English', summary: 'a faster, mobile-first homepage' };

  it('grounds the chat in the lead + demo and speaks the client language', () => {
    const p = buildInquirySystemPrompt(ctx);
    expect(p).toContain('Ruve Nail Spa');
    expect(p).toContain('nail salon');
    expect(p).toContain('a faster, mobile-first homepage');
    expect(p).toContain('Reply in English');
  });

  it('FORBIDS quoting a price / date / commitment (the load-bearing rule)', () => {
    const p = buildInquirySystemPrompt(ctx).toLowerCase();
    expect(p).toContain('never quote a specific price');
    expect(p).toMatch(/founder will follow up/);
    // it should ask for budget/timeline (light qualification) but never promise numbers
    expect(p).toContain('budget');
    expect(p).toContain('timeline');
  });

  it('omits the summary line cleanly when there is none', () => {
    const p = buildInquirySystemPrompt({ ...ctx, summary: null });
    expect(p).not.toContain('What the redesign focuses on');
    expect(p).toContain('Reply in English'); // still well-formed
  });

  it('carries a non-English market language through', () => {
    expect(buildInquirySystemPrompt({ ...ctx, language: 'Vietnamese' })).toContain('Reply in Vietnamese');
  });
});
