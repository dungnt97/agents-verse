// Atlas — brand strategist / creative + design director. Two task defs (skills): the Pass-1 creative
// spec and the Pass-4 synthesis of the review board into one prioritized fix list. Both wrap existing
// demo-gen builders unchanged and emit decisive text (no HTML). tsx-safe: relative imports, no server-only.
import { buildDirectorPrompt, buildReviewSynthesisPrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef } from '../types';

export interface DirectorInput {
  input: DemoGenInput;
  researchBrief: string;
}

export interface SynthesisInput {
  input: DemoGenInput;
  reviews: string[];
}

// Pass 1 — write the tight, reference-anchored creative-director spec the build pass will follow.
export const atlasDirector: AgentDef<DirectorInput, string> = {
  id: 'atlas',
  role: 'Brand Strategist — creative-director design spec',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 180_000, maxTurns: 1 },
  buildPrompt: ({ input, researchBrief }) => buildDirectorPrompt(input, researchBrief),
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
