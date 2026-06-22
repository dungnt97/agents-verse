// Canonical agent roster — the primary task def per dashboard-named agent, keyed by AgentId. The
// central orchestrator (later phase) resolves agents through `getAgent`; the demo pipeline imports the
// concrete typed defs directly. Multi-pass agents export their extra task defs from their own files
// (Atlas synthesis, Nova revise); board sub-lenses (copy/niche) live in board.ts, not the roster.
// tsx-safe: relative imports, no `server-only`.
import type { AnyAgentDef } from './types';
import { atlasDirector } from './defs/atlas-strategist';
import { novaBuilder } from './defs/nova-designer';
import { irisReview } from './defs/iris-ux';
import { kiraReview } from './defs/kira-qa';

export const AGENTS = {
  atlas: atlasDirector,
  nova: novaBuilder,
  iris: irisReview,
  kira: kiraReview,
} satisfies Record<string, AnyAgentDef>;

export type RegisteredAgentId = keyof typeof AGENTS;

export function getAgent(id: RegisteredAgentId): AnyAgentDef {
  return AGENTS[id];
}
