// Nova — UI designer / front-end engineer. Two task defs (skills): the Pass-2 build from Atlas's spec
// and the Pass-5 major revision against the board's fix list. Both wrap existing demo-gen builders
// unchanged and emit one complete HTML document. tsx-safe: relative imports, no `server-only`.
import { buildBuildPrompt, buildRevisePrompt, buildLayoutFixPrompt, buildQaFixPrompt, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef } from '../types';
import { makeHtmlValidator } from '../validators';

export interface BuildInput {
  input: DemoGenInput;
  spec: string;
  /** The Vega research brief — carries the curated VENUE PHOTOS block (real photo URLs + placement) so the
   *  builder embeds the real photos even when the ~300-word spec drops their long URLs. */
  researchBrief?: string;
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
  // A concept-driven build (a signature interactive page) is larger + more agentic than the old generic
  // page: at maxTurns:1 the CLI's default tools let the model take a tool turn and hit `error_max_turns`
  // before finishing. Give it a few turns + 15 min so a big build completes (the prompt also tells it to
  // emit HTML directly without tools). 600s/1-turn previously SIGKILLed/erred big builds mid-stream.
  limits: { timeoutMs: 900_000, maxTurns: 4 },
  buildPrompt: ({ input, spec, researchBrief }) => buildBuildPrompt(input, spec, researchBrief),
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

export interface LayoutFixInput {
  input: DemoGenInput;
  fixList: string;
  currentHtml: string;
}

// Deterministic-guard pass (runs after the vision board, on the audited HTML) — applies ONLY the
// mechanically-measured layout fixes (overflow, text past the edge, a decorative spine crossing a
// heading, broken images). Text-only: no screenshots needed since the defect list is already precise.
export const novaLayoutFixer: AgentDef<LayoutFixInput, string> = {
  id: 'nova',
  role: 'UI Designer — surgical fix of measured layout defects',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 600_000, maxTurns: 4 },
  buildPrompt: ({ input, fixList, currentHtml }) => buildLayoutFixPrompt(input, fixList, currentHtml),
  validate: html,
};

// Runtime-health guard pass — repairs console/JS errors, broken assets, and a11y gaps (missing alt /
// lang / h1 / accessible names). Uses a prompt that PERMITS the script/attribute/asset edits those fixes
// require, unlike the visual-only layout fixer whose prompt forbids them. Text-only (findings are precise).
export const novaQaFixer: AgentDef<LayoutFixInput, string> = {
  id: 'nova',
  role: 'UI Designer — surgical fix of runtime/accessibility defects',
  model: 'opus',
  tools: [],
  limits: { timeoutMs: 600_000, maxTurns: 4 },
  buildPrompt: ({ input, fixList, currentHtml }) => buildQaFixPrompt(input, fixList, currentHtml),
  validate: html,
};
