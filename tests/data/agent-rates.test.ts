import { describe, it, expect } from 'vitest';
import { AGENT_UNIT_RATE, estCost } from '@/lib/data/agent-rates';

// estCost backs the dashboard's per-agent spend overlay (counts × per-unit rate). Pin that it rounds to
// cents, never goes negative, and returns undefined for an agent without a rate (so the overlay leaves
// that agent's seeded cost untouched rather than blanking it).
describe('estCost', () => {
  it('estimates a rated agent as units × rate, rounded to cents', () => {
    expect(estCost(10, 'orion')).toBe(Math.round(10 * AGENT_UNIT_RATE.orion * 100) / 100);
    expect(estCost(3, 'echo')).toBe(Math.round(3 * AGENT_UNIT_RATE.echo * 100) / 100);
  });

  it('returns undefined for an agent with no defined rate (keep its seeded cost)', () => {
    expect(estCost(5, 'closer')).toBeUndefined();
    expect(estCost(5, 'ledger')).toBeUndefined();
  });

  it('clamps negative unit counts to zero', () => {
    expect(estCost(-4, 'nova')).toBe(0);
  });
});
