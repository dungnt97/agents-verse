// Vega — Website Critic / researcher. Pass 0 (best-effort): study the client's CURRENT site to extract
// their REAL brand, and benchmark best-in-class niche references, into a brief the director designs from.
// Uses Read to view the old-site screenshots; niche references come from the model's own knowledge
// (live WebFetch/WebSearch is unreliable through the Kiro gateway). tsx-safe:
// relative imports, no `server-only`.
import { buildResearchPrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef } from '../types';

export interface ResearchInput {
  input: DemoGenInput;
  oldSitePngs: string[];
}

export const vegaResearcher: AgentDef<ResearchInput, string> = {
  id: 'vega',
  role: 'Website Critic — research the client brand + niche references',
  model: 'opus',
  tools: ['Read'],
  limits: { timeoutMs: 240_000, maxTurns: 8 },
  buildPrompt: ({ input, oldSitePngs }) => buildResearchPrompt(input, oldSitePngs),
  validate: (raw) => raw.trim(),
};
