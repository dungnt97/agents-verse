// Typed contracts for the shared agent runtime. Pure (no side effects) and tsx-safe: relative imports
// only, never `import 'server-only'` — these modules run in the worker chain under tsx. Generalises the
// previously-inlined demo-gen engine: an agent is an `AgentDef` describing how to prompt one `claude`
// CLI call and how to validate its output.

// Roster agent identities. Iris/Kira are the dashboard-named review members; 'copy'/'niche' are
// board-internal review sub-lenses (they have ids but no roster card). More are added in later phases.
export type AgentId = 'atlas' | 'nova' | 'iris' | 'kira' | 'copy' | 'niche' | 'vega' | 'closer' | 'echo';

// Subscription CLI model tier — maps directly to `claude --model`.
export type AgentModel = 'opus' | 'sonnet' | 'haiku';

// Tools an agent may use during its turn (passed to `claude --allowedTools`). Review/revise passes need
// Read to view the rendered screenshots; the spec/build passes use none.
export type AgentTool = 'Read' | 'Bash' | 'WebFetch' | 'WebSearch';

// Per-call resource caps. `timeoutMs` hard-kills the CLI; `maxTurns` bounds the agentic back-and-forth.
export interface AgentLimits {
  timeoutMs: number;
  maxTurns: number;
}

// Run-scoped context. Phase 1 only uses `signal` (cooperative cancellation); later phases thread the
// pipeline run/lead identity through here for the orchestrator and the cost ledger.
export interface AgentContext {
  signal?: AbortSignal;
}

// Turns a CLI raw string into the agent's typed output, or throws if the output is unusable.
export type OutputValidator<O> = (raw: string) => O;

// One agent task = identity + model/tools/limits + how to build its prompt from a typed input + how to
// validate its output. `buildPrompt` wraps the existing demo-gen prompt builders unchanged. A single
// agent may export several task defs (e.g. Nova builds and revises).
export interface AgentDef<I, O> {
  id: AgentId;
  role: string;
  model: AgentModel;
  tools: AgentTool[];
  limits: AgentLimits;
  buildPrompt: (input: I) => string;
  validate: OutputValidator<O>;
}

// Erased supertype for storing heterogeneous defs in a registry/map. `(input: never)` keeps the
// contravariant `buildPrompt` assignable from any concrete `AgentDef<I, O>` without resorting to `any`.
export type AnyAgentDef = {
  id: AgentId;
  role: string;
  model: AgentModel;
  tools: AgentTool[];
  limits: AgentLimits;
  buildPrompt: (input: never) => string;
  validate: (raw: string) => unknown;
};

// Result envelope for later phases (orchestrator/ledger provenance). Phase 1's `runAgent` returns the
// validated output directly; this pairs it with the agent identity when a caller needs to know who ran.
export interface AgentResult<O> {
  agentId: AgentId;
  output: O;
}
