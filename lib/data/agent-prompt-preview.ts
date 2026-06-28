// Renders the VERBATIM runtime prompt for the demo-gen agents against a representative sample job, so
// the founder can read the real instructions on the agent detail screen. Pure (imports only the prompt
// builders, which are themselves pure). Returns null for agents whose work isn't a single renderable
// prompt (deterministic agents like ledger, or web-action agents documented in the brief instead).
import {
  buildResearchPrompt,
  buildDirectorPrompt,
  buildBuildPrompt,
  type DemoGenInput,
} from '@/lib/demo-gen/prompt';

// A representative job (illustrative values) — the point is to show the prompt's real STRUCTURE and
// instructions, not real audit numbers.
const SAMPLE: DemoGenInput = {
  company: 'Highlands Coffee',
  industry: 'Coffee & Hospitality',
  city: 'Ho Chi Minh City',
  url: 'https://current-site.example',
  scores: { visual: 38, mobile: 33, cta: 35, trust: 47, seo: 49, speed: 58, content: 44, conversion: 35 },
  problems: [
    'Dated hero with no clear value proposition',
    'Weak mobile layout with tiny tap targets',
    'Order / booking CTA buried below the fold',
  ],
  redesign: {
    cta: 'Order ahead',
    content: 'warm, premium, locally proud',
    sections: ['Hero', 'Daypart menu', 'Store locator', 'Loyalty', 'Footer'],
  } as DemoGenInput['redesign'],
  summary: 'A well-known brand let down by a dated, low-converting site — strong redesign upside.',
};

export function agentPromptPreview(id: string): string | null {
  switch (id) {
    case 'vega':
      return buildResearchPrompt(SAMPLE, ['<full-page screenshot of the current site>']);
    case 'atlas':
      return buildDirectorPrompt(SAMPLE, "<Vega's research brief>", '<the winning concept>');
    case 'nova':
      return buildBuildPrompt(SAMPLE, "<Atlas's creative-director spec>");
    default:
      return null;
  }
}
