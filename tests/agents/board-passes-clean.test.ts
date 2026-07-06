import { describe, it, expect } from 'vitest';
import { boardPassesClean } from '@/lib/agents/pipelines/demo';

// The demo review loop skips the synth+revise round only when the board is genuinely clean. This guards
// the parsing that makes the early-stop reachable (the old `reviews.length === 0` guard never fired on a
// passing board — only when every lens crashed).
describe('boardPassesClean', () => {
  const pass = 'Standards…\n- Expected: x · Gap: none · Fix: minor polish · Severity: minor\nVERDICT: PASS + tighten the footer';
  const hold = 'Standards…\n- Expected: x · Gap: weak hero · Fix: bolder · Severity: major\nVERDICT: HOLD — bolder hero';
  const passWithBlocker = 'Standards…\n- Expected: x · Gap: overlap · Fix: y · Severity: blocker\nVERDICT: PASS';

  it('is true only when every lens passes and none flags a blocker', () => {
    expect(boardPassesClean([pass, pass, pass, pass])).toBe(true);
  });

  it('is false when any lens holds', () => {
    expect(boardPassesClean([pass, hold, pass])).toBe(false);
  });

  it('is false when a lens passes but still flags a blocker-severity defect', () => {
    expect(boardPassesClean([pass, passWithBlocker])).toBe(false);
  });

  it('is false on an empty board (every lens crashed — not an all-clear)', () => {
    expect(boardPassesClean([])).toBe(false);
  });

  it('matches the verdict token case-insensitively and ignores surrounding prose', () => {
    expect(boardPassesClean(['blah\nverdict: pass\nmore'])).toBe(true);
  });
});
