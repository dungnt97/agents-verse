// Vega — Website Critic / researcher. Pass 0 (best-effort): study the client's CURRENT site to extract
// their REAL brand, and benchmark best-in-class niche references, into a brief the director designs from.
// Uses Read to view the old-site screenshots; niche references come from the model's own knowledge
// (live WebFetch/WebSearch is unreliable through the Kiro gateway). tsx-safe:
// relative imports, no `server-only`.
import { buildResearchPrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef } from '../types';
import { makeTextValidator } from '../validators';

export interface ResearchInput {
  input: DemoGenInput;
  oldSitePngs: string[];
  /** Real venue photos (local temp files + embed URLs) for Vega to view + curate the best. */
  venuePhotos?: { path: string; url: string }[];
}

export const vegaResearcher: AgentDef<ResearchInput, string> = {
  id: 'vega',
  role: 'Website Critic — research the client brand + niche references',
  model: 'opus',
  tools: ['Read'],
  // Multi-turn vision research over a large full-page screenshot + venue photos; headroom for a slow first token.
  limits: { timeoutMs: 360_000, maxTurns: 8 },
  buildPrompt: ({ input, oldSitePngs, venuePhotos }) => buildResearchPrompt(input, oldSitePngs, venuePhotos),
  // Empty output THROWS so runAgent retries (the caller treats a research failure as best-effort and
  // falls back to an empty brief; a bare trim would return '' without ever retrying the gateway blip).
  validate: makeTextValidator(),
};
