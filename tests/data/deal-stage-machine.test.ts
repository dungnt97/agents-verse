import { describe, it, expect } from 'vitest';

import {
  DEAL_TRANSITIONS,
  DEAL_AUTO_APPROVE_LIMIT,
  DEAL_CONF_FLOOR,
  isDealStage,
  nextStages,
  isTerminalStage,
  canTransition,
  requiresApproval,
  decideReplyOutcome,
  type DealStage,
} from '@/lib/data/deal-stage-machine';

// `lib/data/deal-stage-machine.ts` is the single client-safe source of truth for legal deal
// transitions and for the founder-approval gate. These tests pin the exact transition graph
// and the full approval truth table so a refactor that silently widens/narrows a transition or
// flips the gate logic (especially the subtle `full` mode + confidence-floor interaction) is caught.

const ALL_STAGES: readonly DealStage[] = ['pricing', 'created', 'quoted', 'approval', 'call', 'won', 'lost'];
const TERMINAL: readonly DealStage[] = ['won', 'lost'];

describe('constants', () => {
  it('pins the documented default thresholds', () => {
    expect(DEAL_AUTO_APPROVE_LIMIT).toBe(4000);
    expect(DEAL_CONF_FLOOR).toBe(70);
  });
});

describe('DEAL_TRANSITIONS graph integrity', () => {
  it('maps every stage to exactly the documented legal next-stages', () => {
    expect(DEAL_TRANSITIONS).toEqual({
      pricing: ['quoted', 'lost'],
      created: ['quoted', 'lost'],
      quoted: ['won', 'approval', 'lost'],
      approval: ['won', 'call', 'lost'],
      call: ['won', 'lost'],
      won: [],
      lost: [],
    });
  });

  it('treats won/lost as terminal (empty next-stages) and every other stage as non-empty', () => {
    for (const stage of ALL_STAGES) {
      const next = DEAL_TRANSITIONS[stage];
      if (TERMINAL.includes(stage)) {
        expect(next, `${stage} should be terminal`).toEqual([]);
      } else {
        expect(next.length, `${stage} should have legal transitions`).toBeGreaterThan(0);
      }
    }
  });

  it('only lists valid stages as transition targets', () => {
    for (const stage of ALL_STAGES) {
      for (const target of DEAL_TRANSITIONS[stage]) {
        expect(isDealStage(target), `${stage} -> ${target} target must be a valid stage`).toBe(true);
      }
    }
  });

  it('never lists a self-transition', () => {
    for (const stage of ALL_STAGES) {
      expect(DEAL_TRANSITIONS[stage]).not.toContain(stage);
    }
  });
});

describe('isTerminalStage', () => {
  it('is true for won/lost and false for every advanceable stage', () => {
    expect(isTerminalStage('won')).toBe(true);
    expect(isTerminalStage('lost')).toBe(true);
    for (const stage of ALL_STAGES) {
      const expected = TERMINAL.includes(stage);
      expect(isTerminalStage(stage), `isTerminalStage(${stage})`).toBe(expected);
    }
  });
});

describe('isDealStage', () => {
  it('is true for every real stage key', () => {
    for (const stage of ALL_STAGES) {
      expect(isDealStage(stage)).toBe(true);
    }
  });

  it('is false for junk / non-stage strings', () => {
    expect(isDealStage('foo')).toBe(false);
    expect(isDealStage('')).toBe(false);
    expect(isDealStage('Won')).toBe(false); // case-sensitive
    expect(isDealStage('toString')).toBe(false); // guards against prototype keys (hasOwnProperty)
  });
});

describe('nextStages', () => {
  it('returns the same array the graph defines for a known stage', () => {
    expect(nextStages('quoted')).toEqual(['won', 'approval', 'lost']);
    expect(nextStages('pricing')).toEqual(['quoted', 'lost']);
  });

  it('returns empty for terminal stages', () => {
    expect(nextStages('won')).toEqual([]);
    expect(nextStages('lost')).toEqual([]);
  });

  it('returns empty for an unknown stage (defensive ?? [] fallback)', () => {
    // cast through unknown: nextStages only legally takes DealStage, but the `?? []`
    // branch must still hold if an out-of-type value reaches it at runtime.
    expect(nextStages('mystery' as unknown as DealStage)).toEqual([]);
  });
});

describe('canTransition — legal edges', () => {
  it('allows the documented forward edges', () => {
    expect(canTransition('pricing', 'quoted')).toBe(true);
    expect(canTransition('created', 'quoted')).toBe(true);
    expect(canTransition('quoted', 'won')).toBe(true);
    expect(canTransition('quoted', 'approval')).toBe(true);
    expect(canTransition('approval', 'won')).toBe(true);
    expect(canTransition('approval', 'call')).toBe(true);
    expect(canTransition('call', 'won')).toBe(true);
  });

  it('allows *->lost from every non-terminal stage', () => {
    for (const stage of ALL_STAGES) {
      if (TERMINAL.includes(stage)) continue;
      expect(canTransition(stage, 'lost'), `${stage} -> lost`).toBe(true);
    }
  });
});

describe('canTransition — illegal edges', () => {
  it('rejects stage skips and backward jumps', () => {
    expect(canTransition('pricing', 'won')).toBe(false); // must go through quoted first
    expect(canTransition('pricing', 'approval')).toBe(false);
    expect(canTransition('created', 'approval')).toBe(false);
    expect(canTransition('call', 'approval')).toBe(false); // approval precedes call, no back edge
    expect(canTransition('quoted', 'call')).toBe(false);
  });

  it('rejects any transition out of a terminal stage', () => {
    for (const to of ALL_STAGES) {
      expect(canTransition('won', to), `won -> ${to}`).toBe(false);
      expect(canTransition('lost', to), `lost -> ${to}`).toBe(false);
    }
  });

  it('rejects same-stage self-transitions', () => {
    for (const stage of ALL_STAGES) {
      expect(canTransition(stage, stage), `${stage} -> ${stage}`).toBe(false);
    }
  });

  it('rejects edges from an unknown source stage', () => {
    expect(canTransition('mystery' as unknown as DealStage, 'won')).toBe(false);
  });
});

describe('requiresApproval — manual mode', () => {
  it('always gates, even for a tiny high-confidence deal', () => {
    expect(requiresApproval({ value: 1, conf: 100, autonomyMode: 'manual' })).toBe(true);
    expect(requiresApproval({ value: 50_000, conf: 100, autonomyMode: 'manual' })).toBe(true);
    // manual short-circuits before the conf-floor check too
    expect(requiresApproval({ value: 0, conf: 0, autonomyMode: 'manual' })).toBe(true);
  });
});

describe('requiresApproval — review / guarded mode (value gate)', () => {
  for (const mode of ['review', 'guarded'] as const) {
    it(`${mode}: gates when value >= threshold (conf above floor)`, () => {
      expect(requiresApproval({ value: 5000, conf: 90, autonomyMode: mode })).toBe(true);
    });

    it(`${mode}: does NOT gate when value < threshold and conf >= floor`, () => {
      expect(requiresApproval({ value: 3999, conf: 90, autonomyMode: mode })).toBe(false);
    });

    it(`${mode}: value exactly == threshold gates (>= is inclusive)`, () => {
      expect(requiresApproval({ value: DEAL_AUTO_APPROVE_LIMIT, conf: 90, autonomyMode: mode })).toBe(true);
    });
  }
});

describe('requiresApproval — full mode', () => {
  it('does NOT gate below threshold with conf >= floor (auto-closes)', () => {
    expect(requiresApproval({ value: 3999, conf: 90, autonomyMode: 'full' })).toBe(false);
  });

  it('does NOT gate on high value alone — value >= threshold under full still auto-closes', () => {
    // The implementation only value-gates for review/guarded; full mode ignores the value
    // ceiling entirely and relies solely on the confidence floor.
    expect(requiresApproval({ value: 1_000_000, conf: 90, autonomyMode: 'full' })).toBe(false);
    expect(requiresApproval({ value: DEAL_AUTO_APPROVE_LIMIT, conf: 90, autonomyMode: 'full' })).toBe(false);
  });

  it('gates when confidence is below the floor, even with low value', () => {
    expect(requiresApproval({ value: 100, conf: 69, autonomyMode: 'full' })).toBe(true);
  });
});

describe('requiresApproval — confidence floor (all modes)', () => {
  it('gates when conf < floor regardless of mode', () => {
    for (const mode of ['review', 'guarded', 'full'] as const) {
      expect(requiresApproval({ value: 1, conf: 69, autonomyMode: mode }), `${mode} low conf`).toBe(true);
    }
  });

  it('conf exactly == floor does NOT trigger the conf gate (strict < comparison)', () => {
    // value below threshold + conf at the floor -> nothing gates -> false.
    expect(requiresApproval({ value: 100, conf: DEAL_CONF_FLOOR, autonomyMode: 'full' })).toBe(false);
    expect(requiresApproval({ value: 100, conf: DEAL_CONF_FLOOR, autonomyMode: 'review' })).toBe(false);
  });
});

describe('requiresApproval — custom threshold / confFloor overrides', () => {
  it('uses an explicit threshold instead of the default for the value gate', () => {
    // value 4500 < default 4000? no — so prove override by raising threshold above it.
    expect(requiresApproval({ value: 4500, conf: 90, autonomyMode: 'guarded', threshold: 5000 })).toBe(false);
    expect(requiresApproval({ value: 5000, conf: 90, autonomyMode: 'guarded', threshold: 5000 })).toBe(true);
    // lowering the threshold gates a value the default would have passed.
    expect(requiresApproval({ value: 1000, conf: 90, autonomyMode: 'review', threshold: 500 })).toBe(true);
  });

  it('uses an explicit confFloor instead of the default for the conf gate', () => {
    // conf 75 >= default 70 (would pass) but < custom 80 -> gates.
    expect(requiresApproval({ value: 100, conf: 75, autonomyMode: 'full', confFloor: 80 })).toBe(true);
    // conf 65 < default 70 (would gate) but >= custom 60 -> passes.
    expect(requiresApproval({ value: 100, conf: 65, autonomyMode: 'full', confFloor: 60 })).toBe(false);
  });
});

describe('decideReplyOutcome — Closer routing (advance vs escalate)', () => {
  it('advances on a legal, confident, in-budget recommendation', () => {
    // pricing → quoted is legal; conf above floor; value below threshold; guarded mode.
    expect(
      decideReplyOutcome({ currentStage: 'pricing', recommendedStage: 'quoted', conf: 90, value: 1000, autonomyMode: 'guarded' }),
    ).toEqual({ action: 'advance', toStage: 'quoted' });
  });

  it('ALWAYS escalates when confidence is below the floor (every mode) — never auto-advances on a guess', () => {
    for (const autonomyMode of ['manual', 'review', 'guarded', 'full'] as const) {
      const res = decideReplyOutcome({ currentStage: 'pricing', recommendedStage: 'quoted', conf: 69, value: 100, autonomyMode });
      expect(res.action, `${autonomyMode} low-conf`).toBe('escalate');
    }
  });

  it('escalates when the deal value is at/above the auto-approve threshold (review/guarded)', () => {
    for (const autonomyMode of ['review', 'guarded'] as const) {
      const res = decideReplyOutcome({ currentStage: 'quoted', recommendedStage: 'won', conf: 95, value: DEAL_AUTO_APPROVE_LIMIT, autonomyMode });
      expect(res.action, `${autonomyMode} over-threshold`).toBe('escalate');
    }
  });

  it('escalates an illegal / non-next stage rather than forcing it', () => {
    // pricing → won is not a legal next stage (must pass through quoted); never auto-jump.
    const res = decideReplyOutcome({ currentStage: 'pricing', recommendedStage: 'won', conf: 99, value: 100, autonomyMode: 'full' });
    expect(res.action).toBe('escalate');
  });

  it('manual mode always escalates even a legal high-conf low-value move', () => {
    expect(
      decideReplyOutcome({ currentStage: 'pricing', recommendedStage: 'quoted', conf: 99, value: 1, autonomyMode: 'manual' }).action,
    ).toBe('escalate');
  });

  it('full mode auto-advances a legal high-conf move regardless of value (only the conf floor gates it)', () => {
    expect(
      decideReplyOutcome({ currentStage: 'quoted', recommendedStage: 'won', conf: 90, value: 1_000_000, autonomyMode: 'full' }),
    ).toEqual({ action: 'advance', toStage: 'won' });
  });

  it('closing (→ won) ALWAYS escalates outside full mode — even a tiny high-conf deal needs sign-off', () => {
    for (const autonomyMode of ['manual', 'review', 'guarded'] as const) {
      const res = decideReplyOutcome({ currentStage: 'quoted', recommendedStage: 'won', conf: 99, value: 1, autonomyMode });
      expect(res.action, `${autonomyMode} close`).toBe('escalate');
    }
  });

  it('a non-close advance (→ quoted) still auto-advances in guarded when confident + in-budget', () => {
    expect(
      decideReplyOutcome({ currentStage: 'pricing', recommendedStage: 'quoted', conf: 85, value: 1, autonomyMode: 'guarded' }),
    ).toEqual({ action: 'advance', toStage: 'quoted' });
  });

  it("'hold' always escalates (no stage change) regardless of mode/conf — the deal stays put for review", () => {
    for (const autonomyMode of ['manual', 'review', 'guarded', 'full'] as const) {
      const res = decideReplyOutcome({ currentStage: 'pricing', recommendedStage: 'hold', conf: 95, value: 1, autonomyMode });
      expect(res.action, `${autonomyMode} hold`).toBe('escalate');
      // A hold never yields a toStage — it must not move the deal.
      expect('toStage' in res).toBe(false);
    }
  });
});
