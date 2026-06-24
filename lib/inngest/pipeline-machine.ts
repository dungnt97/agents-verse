// Pure pipeline transition brain. Given the last fact event + the run's current position + the LIVE
// founder settings, it decides the orchestrator's next move. No I/O, no drizzle, no `server-only` —
// it's shared by the worker orchestrator and the unit tests, and stays tsx-safe (relative type
// imports only) since the worker chain runs under tsx where `server-only` throws and `@/` won't
// resolve. This is the single source of truth for legal pipeline hops and for the autonomy gate,
// the way deal-stage-machine.ts is for deals.

import type { AutonomyMode } from '../data/deal-stage-machine';

export type PipelineStage = 'audit' | 'demo' | 'outreach' | 'reply' | 'deal' | 'delivery';
export type PipelineRunStatus = 'running' | 'waiting_approval' | 'paused' | 'done' | 'failed';

// Fact events a worker step emits when it concludes.
export type PipelineFact = 'audit/completed' | 'demo/completed';

// Run statuses that count as "in flight" — the set the partial-unique active-run index keys on and
// the guard every conditional stage write uses.
export const ACTIVE_RUN_STATUSES: readonly PipelineRunStatus[] = [
  'running',
  'waiting_approval',
  'paused',
];

// The stage a run MUST be in for a given fact to be the live next-step. Anything else means the run
// already moved past this step — a stale / duplicate at-least-once delivery — and the fact is ignored.
// This is the idempotency anchor at the pure layer (the conditional DB write is belt-and-suspenders).
export const FACT_FROM_STAGE: Record<PipelineFact, PipelineStage> = {
  'audit/completed': 'audit',
  'demo/completed': 'demo',
};

// Modes in which a SAFE pre-client hop (audit→demo produces no outbound contact) may auto-run.
// `manual` and `review` keep the founder driving every step (auto-chain off); `guarded`/`full` let
// pre-client work flow — the founder gate lands later in the funnel, before outbound email or close.
const PRECLIENT_AUTOHOP_MODES: readonly AutonomyMode[] = ['guarded', 'full'];

// What the orchestrator should do after observing a fact.
export type NextHop =
  | { kind: 'emit'; event: 'demo/requested'; from: PipelineStage; to: PipelineStage }
  | { kind: 'gate'; from: PipelineStage; reason: string }
  | { kind: 'done'; from: PipelineStage }
  | { kind: 'fail'; reason: string }
  | { kind: 'stop'; reason: string };

export interface HopInput {
  fact: PipelineFact;
  outcome: 'ok' | 'failed';
  run: { stage: PipelineStage; status: PipelineRunStatus };
  settings: { autonomyMode: AutonomyMode };
}

export function decideNextHop({ fact, outcome, run, settings }: HopInput): NextHop {
  // Kill switch / parked / terminal run: never act on an incoming fact. A run parked at a gate is
  // released ONLY by an explicit founder resume action (a later phase) — never by an at-least-once
  // fact redelivery, even if the founder flips autonomy to a more permissive mode in between.
  if (run.status === 'paused') return { kind: 'stop', reason: 'run is paused' };
  if (run.status === 'waiting_approval') return { kind: 'stop', reason: 'run awaiting approval' };
  if (run.status === 'done' || run.status === 'failed') {
    return { kind: 'stop', reason: `run already ${run.status}` };
  }
  // Stale / duplicate fact (at-least-once delivery): the run already moved past this step.
  const from = FACT_FROM_STAGE[fact];
  if (run.stage !== from) {
    return { kind: 'stop', reason: `stale fact ${fact}: run at ${run.stage}` };
  }
  // A terminally-failed step fails the run (the worker already recorded its own per-step failure).
  if (outcome === 'failed') return { kind: 'fail', reason: `step failed: ${fact}` };

  switch (fact) {
    case 'audit/completed': {
      // audit→demo is pre-client and safe; auto-run it unless the founder drives steps manually.
      if (PRECLIENT_AUTOHOP_MODES.includes(settings.autonomyMode)) {
        return { kind: 'emit', event: 'demo/requested', from: 'audit', to: 'demo' };
      }
      return { kind: 'gate', from: 'audit', reason: 'manual advance to demo' };
    }
    case 'demo/completed':
      // The auto-chain ends at the built demo for now (outreach is a later subsystem). The run is
      // complete; the funnel beyond demo is wired in subsequent phases.
      return { kind: 'done', from: 'demo' };
  }
}
