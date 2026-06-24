// Nova — UI designer / front-end engineer. Two task defs (skills): the Pass-2 build from Atlas's spec
// and the Pass-5 major revision against the board's fix list. Both wrap existing demo-gen builders
// unchanged and emit one complete HTML document. tsx-safe: relative imports, no `server-only`.
import { buildBuildPrompt, buildRevisePrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef } from '../types';
import { makeHtmlValidator } from '../validators';

export interface BuildInput {
  input: DemoGenInput;
  spec: string;
}

export interface ReviseInput {
  input: DemoGenInput;
  fixes: string;
  desktopPngs: string[];
  mobilePngs: string[];
  currentHtml: string;
}

const html = makeHtmlValidator();

// Pass 2 — build the page from the creative-director spec (text in, complete HTML out).
export const novaBuilder: AgentDef<BuildInput, string> = {
  id: 'nova',
  role: 'UI Designer — build the page from the spec',
  model: 'opus',
  tools: [],
  // A full single-shot HTML build streams ~6+ min on opus (observed 276-390s through the gateway); 600s
  // gives real headroom so a healthy build is never SIGKILLed mid-stream — the old 300s wall cut builds
  // off near completion, failing all 3 retries and sinking the whole demo run.
  limits: { timeoutMs: 600_000, maxTurns: 1 },
  buildPrompt: ({ input, spec }) => buildBuildPrompt(input, spec),
  validate: html,
};

// Pass 5 — revise the built page to satisfy the fix list (reads the screenshots, so needs Read).
export const novaReviser: AgentDef<ReviseInput, string> = {
  id: 'nova',
  role: 'UI Designer — revise the page against the fix list',
  model: 'opus',
  tools: ['Read'],
  // Revise rewrites the full document too (observed ~390s); match the build's 600s headroom.
  limits: { timeoutMs: 600_000, maxTurns: 10 },
  buildPrompt: ({ input, fixes, desktopPngs, mobilePngs, currentHtml }) =>
    buildRevisePrompt(input, fixes, desktopPngs, mobilePngs, currentHtml),
  validate: html,
};
