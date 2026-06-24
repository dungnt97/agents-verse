import { describe, it, expect } from 'vitest';

import {
  decideNextHop,
  FACT_FROM_STAGE,
  ACTIVE_RUN_STATUSES,
  type HopInput,
  type PipelineFact,
  type PipelineRunStatus,
} from '@/lib/inngest/pipeline-machine';
import type { AutonomyMode } from '@/lib/data/deal-stage-machine';

// `lib/inngest/pipeline-machine.ts` is the single source of truth for legal pipeline hops + the
// autonomy gate + at-least-once (stale-fact) idempotency. These tests pin the decision table so a
// refactor that auto-advances when it shouldn't, skips the gate, or double-fires on a duplicate
// delivery is caught here rather than in a live worker run.

const ALL_MODES: readonly AutonomyMode[] = ['manual', 'review', 'guarded', 'full'];

// Convenience builder: a healthy run at the stage the fact expects, with the given mode.
function hop(over: Partial<HopInput> & Pick<HopInput, 'fact'>): HopInput {
  const fact = over.fact;
  return {
    fact,
    outcome: over.outcome ?? 'ok',
    run: over.run ?? { stage: FACT_FROM_STAGE[fact], status: 'running' },
    settings: over.settings ?? { autonomyMode: 'guarded' },
  };
}

describe('FACT_FROM_STAGE / ACTIVE_RUN_STATUSES', () => {
  it('maps each fact to the stage that must precede it', () => {
    expect(FACT_FROM_STAGE).toEqual({ 'audit/completed': 'audit', 'demo/completed': 'demo' });
  });

  it('counts running/waiting_approval/paused as the active set', () => {
    expect(ACTIVE_RUN_STATUSES).toEqual(['running', 'waiting_approval', 'paused']);
  });
});

describe('decideNextHop — audit/completed auto-hop vs gate', () => {
  it('auto-hops to demo under guarded/full (pre-client work is allowed to flow)', () => {
    for (const autonomyMode of ['guarded', 'full'] as const) {
      expect(decideNextHop(hop({ fact: 'audit/completed', settings: { autonomyMode } }))).toEqual({
        kind: 'emit',
        event: 'demo/requested',
        from: 'audit',
        to: 'demo',
      });
    }
  });

  it('gates (no auto-chain) under manual/review — founder advances each step', () => {
    for (const autonomyMode of ['manual', 'review'] as const) {
      expect(decideNextHop(hop({ fact: 'audit/completed', settings: { autonomyMode } }))).toEqual({
        kind: 'gate',
        from: 'audit',
        reason: 'manual advance to demo',
      });
    }
  });
});

describe('decideNextHop — demo/completed closes the run', () => {
  it('returns done in every mode (auto-chain ends at the built demo for now)', () => {
    for (const autonomyMode of ALL_MODES) {
      expect(decideNextHop(hop({ fact: 'demo/completed', settings: { autonomyMode } }))).toEqual({
        kind: 'done',
        from: 'demo',
      });
    }
  });
});

describe('decideNextHop — kill switch + terminal runs never act', () => {
  it('a paused run stops regardless of fact/mode', () => {
    expect(
      decideNextHop(hop({ fact: 'audit/completed', run: { stage: 'audit', status: 'paused' } })),
    ).toEqual({ kind: 'stop', reason: 'run is paused' });
  });

  it('an already done/failed run stops', () => {
    for (const status of ['done', 'failed'] as const) {
      const res = decideNextHop(hop({ fact: 'audit/completed', run: { stage: 'audit', status } }));
      expect(res).toEqual({ kind: 'stop', reason: `run already ${status}` });
    }
  });

  it('a run parked at a gate is NOT auto-advanced by a redelivered fact, even under a permissive mode', () => {
    // Regression: founder parked the run (manual/review → gate), then flips to guarded; a stray
    // at-least-once redelivery of audit/completed must NOT release the gate — only an explicit resume.
    for (const autonomyMode of ALL_MODES) {
      const res = decideNextHop(
        hop({
          fact: 'audit/completed',
          run: { stage: 'audit', status: 'waiting_approval' },
          settings: { autonomyMode },
        }),
      );
      expect(res).toEqual({ kind: 'stop', reason: 'run awaiting approval' });
    }
  });
});

describe('decideNextHop — stale / duplicate fact (at-least-once safety)', () => {
  it('ignores a fact whose expected from-stage no longer matches the run', () => {
    // audit/completed delivered twice: the run has already advanced to demo → the 2nd is stale.
    const res = decideNextHop(
      hop({ fact: 'audit/completed', run: { stage: 'demo', status: 'running' } }),
    );
    expect(res).toEqual({ kind: 'stop', reason: 'stale fact audit/completed: run at demo' });
  });

  it('ignores a demo fact when the run is still at audit', () => {
    const res = decideNextHop(
      hop({ fact: 'demo/completed', run: { stage: 'audit', status: 'running' } }),
    );
    expect(res).toEqual({ kind: 'stop', reason: 'stale fact demo/completed: run at audit' });
  });
});

describe('decideNextHop — terminal failure fails the run', () => {
  it('a failed outcome on a matching live stage fails the run', () => {
    for (const fact of Object.keys(FACT_FROM_STAGE) as PipelineFact[]) {
      expect(decideNextHop(hop({ fact, outcome: 'failed' }))).toEqual({
        kind: 'fail',
        reason: `step failed: ${fact}`,
      });
    }
  });

  it('the kill switch wins over a failure (a paused run stops, not fails)', () => {
    const res = decideNextHop(
      hop({ fact: 'audit/completed', outcome: 'failed', run: { stage: 'audit', status: 'paused' } }),
    );
    expect(res).toEqual({ kind: 'stop', reason: 'run is paused' });
  });

  it('a stale failure is ignored, not re-failed (idempotent)', () => {
    const stale: PipelineRunStatus = 'running';
    const res = decideNextHop(
      hop({ fact: 'audit/completed', outcome: 'failed', run: { stage: 'demo', status: stale } }),
    );
    expect(res.kind).toBe('stop');
  });
});
