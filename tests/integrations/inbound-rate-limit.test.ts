import { describe, it, expect } from 'vitest';
import { inboundRateLimited } from '@/lib/integrations/inbound-rate-limit';

// Defaults: 5 per lead / 10 min, 60 global / 10 min. The module holds process-wide state, so use distinct
// lead ids per test and advance `now` to isolate windows.
describe('inboundRateLimited', () => {
  it('allows up to the per-lead cap, then drops within the window', () => {
    const t0 = 1_000_000;
    const lead = 'lead-rl-a';
    // First 5 are allowed (this call counts), the 6th is over the cap.
    for (let i = 0; i < 5; i++) expect(inboundRateLimited(lead, t0 + i)).toBe(false);
    expect(inboundRateLimited(lead, t0 + 5)).toBe(true);
  });

  it('lets the per-lead window recover after it elapses', () => {
    const lead = 'lead-rl-b';
    for (let i = 0; i < 5; i++) inboundRateLimited(lead, 2_000_000 + i);
    expect(inboundRateLimited(lead, 2_000_000 + 5)).toBe(true);
    // 11 minutes later the trailing window has cleared.
    expect(inboundRateLimited(lead, 2_000_000 + 11 * 60_000)).toBe(false);
  });

  it('caps different leads independently (one noisy lead does not block another)', () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 6; i++) inboundRateLimited('lead-rl-noisy', t0 + i);
    expect(inboundRateLimited('lead-rl-quiet', t0 + 6)).toBe(false);
  });
});
