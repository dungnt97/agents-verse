// Deal lifecycle state machine + founder-approval gate. Pure and client-safe (no `server-only`,
// no drizzle imports) so the drawer (client), the server actions, and unit tests all share one
// source of truth for legal transitions and for when closing a deal needs founder sign-off.

export type DealStage = 'pricing' | 'created' | 'quoted' | 'approval' | 'call' | 'won' | 'lost';
export type AutonomyMode = 'manual' | 'review' | 'guarded' | 'full';

// Legal next-stages per stage. `won` / `lost` are terminal (empty list).
export const DEAL_TRANSITIONS: Record<DealStage, readonly DealStage[]> = {
  pricing: ['quoted', 'lost'],
  created: ['quoted', 'lost'],
  quoted: ['won', 'approval', 'lost'],
  approval: ['won', 'call', 'lost'],
  call: ['won', 'lost'],
  won: [],
  lost: [],
};

// Default founder auto-approve ceiling (USD); overridable via settings.guardrails.autoApproveLimit.
export const DEAL_AUTO_APPROVE_LIMIT = 4000;
// Deals below this AI confidence always route to founder review, regardless of value/mode.
export const DEAL_CONF_FLOOR = 70;

export function isDealStage(s: string): s is DealStage {
  return Object.prototype.hasOwnProperty.call(DEAL_TRANSITIONS, s);
}

export function nextStages(from: DealStage): readonly DealStage[] {
  return DEAL_TRANSITIONS[from] ?? [];
}

export function isTerminalStage(stage: DealStage): boolean {
  return (DEAL_TRANSITIONS[stage]?.length ?? 0) === 0;
}

export function canTransition(from: DealStage, to: DealStage): boolean {
  return DEAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export interface ApprovalGateInput {
  value: number;
  conf: number;
  autonomyMode: AutonomyMode;
  threshold?: number;
  confFloor?: number;
}

// Whether closing a deal (advancing to `won`) requires founder approval rather than auto-closing.
// - manual: always gates
// - review / guarded: gates when value is at/above the auto-approve threshold
// - any mode: gates when AI confidence is below the floor
// - full: auto-closes unless confidence is below the floor
export function requiresApproval({
  value,
  conf,
  autonomyMode,
  threshold = DEAL_AUTO_APPROVE_LIMIT,
  confFloor = DEAL_CONF_FLOOR,
}: ApprovalGateInput): boolean {
  if (autonomyMode === 'manual') return true;
  if ((autonomyMode === 'review' || autonomyMode === 'guarded') && value >= threshold) return true;
  if (conf < confFloor) return true;
  return false;
}

export interface ReplyDecisionInput {
  currentStage: DealStage;
  recommendedStage: DealStage;
  conf: number;
  value: number;
  autonomyMode: AutonomyMode;
  threshold?: number;
  confFloor?: number;
}

// What the Closer's interpretation of a client reply should do to the deal. PURE — the worker reads
// the deal + live settings, runs the LLM, then routes the (zod-validated) recommendation through here.
// Three layers protect against an LLM mis-step: an illegal transition escalates; the value/confidence
// approval gate escalates (low conf ALWAYS escalates via the floor); only a legal, confident, in-budget
// move auto-advances. Never bypasses DEAL_CONF_FLOOR.
export type ReplyDecision =
  | { action: 'advance'; toStage: DealStage }
  | { action: 'escalate'; reason: string };

export function decideReplyOutcome({
  currentStage,
  recommendedStage,
  conf,
  value,
  autonomyMode,
  threshold,
  confFloor,
}: ReplyDecisionInput): ReplyDecision {
  if (!canTransition(currentStage, recommendedStage)) {
    return { action: 'escalate', reason: `not a legal next stage: ${currentStage} → ${recommendedStage}` };
  }
  // Closing a deal is the biggest commitment — only `full` autonomy may auto-close; every other mode
  // (incl. the default `guarded`) routes a recommended close to the founder, matching the autonomy
  // policy "gate before closing/quoting a deal". This also blunts a prompt-injected reply that tries to
  // talk the model into an auto-close.
  if (recommendedStage === 'won' && autonomyMode !== 'full') {
    return { action: 'escalate', reason: 'closing a deal needs founder sign-off' };
  }
  if (requiresApproval({ value, conf, autonomyMode, threshold, confFloor })) {
    return { action: 'escalate', reason: 'needs founder approval (value/confidence/autonomy gate)' };
  }
  return { action: 'advance', toStage: recommendedStage };
}
