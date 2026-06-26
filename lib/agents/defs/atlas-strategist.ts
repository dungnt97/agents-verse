// Atlas — brand strategist / creative + design director. Two task defs (skills): the Pass-1 creative
// spec and the Pass-4 synthesis of the review board into one prioritized fix list. Both wrap existing
// demo-gen builders unchanged and emit decisive text (no HTML). tsx-safe: relative imports, no server-only.
import { buildConceptPrompt, buildDirectorPrompt, buildReviewSynthesisPrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef } from '../types';

export interface DirectorInput {
  input: DemoGenInput;
  researchBrief: string;
  // The winning concept brief from the concepting pass (Pass 0.5). Absent → the director invents the
  // direction itself (legacy behaviour).
  concept?: string;
  // A per-run aesthetic lane that nudges concepting toward a different visual language each run (so demos
  // don't homogenise into the dark-glass default). Absent → no provocation.
  styleProvocation?: string;
}

export interface SynthesisInput {
  input: DemoGenInput;
  reviews: string[];
}

// Pass 0.5 — explore 3 divergent concepts + pick the boldest credible winner; the build is then built
// AROUND that concept's signature move (what makes the demo distinctive vs a safe category template).
export const atlasConceptor: AgentDef<DirectorInput, string> = {
  id: 'atlas',
  role: 'Creative Director — divergent concepting + pick the signature concept',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 180_000, maxTurns: 1 },
  buildPrompt: ({ input, researchBrief, styleProvocation }) => buildConceptPrompt(input, researchBrief, styleProvocation),
  validate: (raw) => raw.trim(),
};

// Pass 1 — expand the chosen concept into the tight, reference-anchored creative-director spec the build
// pass follows (or invent the direction if no concept was supplied).
export const atlasDirector: AgentDef<DirectorInput, string> = {
  id: 'atlas',
  role: 'Brand Strategist — creative-director design spec',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 180_000, maxTurns: 1 },
  buildPrompt: ({ input, researchBrief, concept }) => buildDirectorPrompt(input, researchBrief, concept),
  validate: (raw) => raw.trim(),
};

// Pass 4 — consolidate the expert review board's notes into one short, prioritized fix list.
export const atlasSynthesizer: AgentDef<SynthesisInput, string> = {
  id: 'atlas',
  role: 'Design Director — consolidate the review board into a fix list',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 180_000, maxTurns: 1 },
  buildPrompt: ({ input, reviews }) => buildReviewSynthesisPrompt(input, reviews),
  validate: (raw) => raw.trim(),
};
