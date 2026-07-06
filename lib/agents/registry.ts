// Agent roster — the PRIMARY task def per dashboard-named agent, keyed by AgentId. The central
// orchestrator (later phase) resolves agents through `getAgent`; the demo pipeline imports the concrete
// typed defs directly (so it does not depend on this map). Multi-pass agents export their EXTRA task defs
// from their own files (Atlas conceptor/synthesizer, Nova reviser/fixers); the board sub-lenses
// (copy/niche) live in board.ts, not the roster. tsx-safe: relative imports, no `server-only`.
import type { AnyAgentDef } from './types';
import { atlasDirector } from './defs/atlas-strategist';
import { novaBuilder } from './defs/nova-designer';
import { irisReview } from './defs/iris-ux';
import { kiraReview } from './defs/kira-qa';
import { vegaResearcher } from './defs/vega-researcher';
import { echoOutreach } from './defs/echo-outreach';
import { closerSales } from './defs/closer-sales';
import { cipherCoder } from './defs/cipher-coder';
import { miraSupport } from './defs/mira-support';

export const AGENTS = {
  atlas: atlasDirector,
  nova: novaBuilder,
  iris: irisReview,
  kira: kiraReview,
  vega: vegaResearcher,
  echo: echoOutreach,
  closer: closerSales,
  cipher: cipherCoder,
  mira: miraSupport,
} satisfies Record<string, AnyAgentDef>;

export type RegisteredAgentId = keyof typeof AGENTS;

export function getAgent(id: RegisteredAgentId): AnyAgentDef {
  return AGENTS[id];
}
