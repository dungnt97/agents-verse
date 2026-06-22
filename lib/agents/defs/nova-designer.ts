// Nova — UI designer / front-end engineer. Two task defs (skills): the Pass-2 build from Atlas's spec
// and the Pass-5 major revision against the board's fix list. Both wrap existing demo-gen builders
// unchanged and emit one complete HTML document. tsx-safe: relative imports, no `server-only`.
import { buildBuildPrompt, buildRevisePrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { DesignDNA } from '../../demo-gen/art-direction';
import type { AgentDef } from '../types';
import { makeHtmlValidator } from '../validators';

export interface BuildInput {
  input: DemoGenInput;
  dna: DesignDNA;
  spec: string;
}

export interface ReviseInput {
  input: DemoGenInput;
  dna: DesignDNA;
  fixes: string;
  desktopPng: string;
  mobilePng: string;
  currentHtml: string;
}

const html = makeHtmlValidator();

// Pass 2 — build the page from the creative-director spec (text in, complete HTML out).
export const novaBuilder: AgentDef<BuildInput, string> = {
  id: 'nova',
  role: 'UI Designer — build the page from the spec',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 300_000, maxTurns: 1 },
  buildPrompt: ({ input, dna, spec }) => buildBuildPrompt(input, dna, spec),
  validate: html,
};

// Pass 5 — revise the built page to satisfy the fix list (reads the screenshots, so needs Read).
export const novaReviser: AgentDef<ReviseInput, string> = {
  id: 'nova',
  role: 'UI Designer — revise the page against the fix list',
  model: 'opus',
  tools: ['Read'],
  limits: { timeoutMs: 420_000, maxTurns: 10 },
  buildPrompt: ({ input, dna, fixes, desktopPng, mobilePng, currentHtml }) =>
    buildRevisePrompt(input, dna, fixes, desktopPng, mobilePng, currentHtml),
  validate: html,
};
