// Renders the VERBATIM runtime prompt for each agent against a representative sample job, so the founder
// can read the real instructions on the agent detail screen. Pure: it only calls the (pure) prompt
// builders + the agent defs' buildPrompt. Returns null for agents with no single renderable prompt
// (ledger is a deterministic cost-meter, not an LLM agent).
import {
  buildResearchPrompt,
  buildDirectorPrompt,
  buildBuildPrompt,
  buildPersonaReviewPrompt,
  REVIEW_PERSONAS,
  type DemoGenInput,
} from '@/lib/demo-gen/prompt';
import { echoOutreach } from '@/lib/agents/defs/echo-outreach';
import { closerSales } from '@/lib/agents/defs/closer-sales';
import { cipherCoder } from '@/lib/agents/defs/cipher-coder';
import { miraSupport } from '@/lib/agents/defs/mira-support';
import { buildOrionPrompt } from '@/lib/discovery/orion-qualify';
import { nextStages } from '@/lib/data/deal-stage-machine';

// A representative job (illustrative values) — the point is to show each prompt's real STRUCTURE and
// instructions, not real audit numbers.
const SAMPLE: DemoGenInput = {
  company: 'Highlands Coffee',
  industry: 'Coffee & Hospitality',
  city: 'Ho Chi Minh City',
  url: 'https://current-site.example',
  language: 'English',
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

const SAMPLE_PKG = 'Business Website redesign';
// A representative client reply (Vietnamese) for the closer preview.
const SAMPLE_REPLY = 'Bên mình quan tâm, nhưng giá hơi cao so với ngân sách. Có gói nào gọn hơn không?';

// 'uiux' and 'art' are always present in REVIEW_PERSONAS (asserted by the board tests), so this never
// returns null — the non-null assertion keeps the branch out of coverage.
function reviewPreview(key: string): string {
  const p = REVIEW_PERSONAS.find((x) => x.key === key)!;
  return buildPersonaReviewPrompt(p, SAMPLE, ['<desktop top→bottom slices>'], ['<mobile top→bottom slices>'], 1280, 390);
}

export function agentPromptPreview(id: string): string | null {
  switch (id) {
    case 'vega':
      return buildResearchPrompt(SAMPLE, ['<full-page screenshot of the current site>']);
    case 'atlas':
      return buildDirectorPrompt(SAMPLE, "<Vega's research brief>", '<the winning concept>');
    case 'nova':
      return buildBuildPrompt(SAMPLE, "<Atlas's creative-director spec>");
    case 'iris':
      return reviewPreview('uiux');
    case 'kira':
      return reviewPreview('art');
    case 'orion':
      return buildOrionPrompt([
        { company: SAMPLE.company, industry: SAMPLE.industry, city: SAMPLE.city, websiteUri: SAMPLE.url, siteScore: 38 },
      ]);
    case 'echo':
      return echoOutreach.buildPrompt({
        company: SAMPLE.company, industry: SAMPLE.industry, city: SAMPLE.city,
        cta: SAMPLE.redesign.cta, summary: SAMPLE.summary, language: SAMPLE.language,
      });
    case 'closer':
      return closerSales.buildPrompt({
        deal: { client: SAMPLE.company, industry: SAMPLE.industry, city: SAMPLE.city, pkg: SAMPLE_PKG, value: 2400, stage: 'quoted' },
        // Derive from the state machine so the founder-facing preview can never show an illegal hop
        // (the old hardcoded list included 'call', which is NOT legal from 'quoted').
        legalNextStages: [...nextStages('quoted')],
        text: SAMPLE_REPLY,
        language: SAMPLE.language,
      });
    case 'cipher':
      return cipherCoder.buildPrompt({
        company: SAMPLE.company, industry: SAMPLE.industry, city: SAMPLE.city, summary: SAMPLE.summary,
      });
    case 'mira':
      return miraSupport.buildPrompt({ client: SAMPLE.company, industry: SAMPLE.industry, city: SAMPLE.city, pkg: SAMPLE_PKG, language: SAMPLE.language });
    default:
      return null;
  }
}
