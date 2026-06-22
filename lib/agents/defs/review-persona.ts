// Factory that wraps a demo-gen ReviewPersona as a review AgentDef. The board's lenses share one input
// shape (the two rendered screenshots) plus the same model/tools/limits — only the persona brief
// differs — so this keeps the four review defs DRY. tsx-safe: relative imports, no `server-only`.
import { buildPersonaReviewPrompt, REVIEW_PERSONAS, type ReviewPersona, type DemoGenInput } from '../../demo-gen/prompt';
import type { AgentDef, AgentId } from '../types';
import { makeTextValidator } from '../validators';

// What every review lens reads: the audit/brief input plus the desktop + mobile screenshot paths.
export interface ReviewInput {
  input: DemoGenInput;
  desktopPng: string;
  mobilePng: string;
}

// Look up a persona brief from the demo-gen library by key (uiux | copy | niche | art).
export function personaByKey(key: string): ReviewPersona {
  const p = REVIEW_PERSONAS.find((x) => x.key === key);
  if (!p) throw new Error(`unknown review persona: ${key}`);
  return p;
}

// Build a review AgentDef for one persona. Matches the single-pass engine's call shape exactly:
// opus, Read tool, 240s / 4 turns, non-empty text (empty/failed reviews get dropped by runBoard).
export function reviewDef(id: AgentId, role: string, persona: ReviewPersona): AgentDef<ReviewInput, string> {
  return {
    id,
    role,
    model: 'opus',
    tools: ['Read'],
    limits: { timeoutMs: 240_000, maxTurns: 4 },
    buildPrompt: ({ input, desktopPng, mobilePng }) => buildPersonaReviewPrompt(persona, input, desktopPng, mobilePng),
    validate: makeTextValidator(),
  };
}
