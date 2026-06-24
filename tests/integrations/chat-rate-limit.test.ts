import { describe, it, expect } from 'vitest';
import { slidingWindowLimiter } from '@/lib/integrations/chat-rate-limit';

describe('slidingWindowLimiter', () => {
  it('allows up to max within the window, then blocks', () => {
    const limited = slidingWindowLimiter(3, 1000);
    expect(limited('ip', 0)).toBe(false);
    expect(limited('ip', 100)).toBe(false);
    expect(limited('ip', 200)).toBe(false);
    expect(limited('ip', 300)).toBe(true); // 4th in-window request exceeds max
  });

  it('ages out hits older than the window', () => {
    const limited = slidingWindowLimiter(1, 1000);
    expect(limited('ip', 0)).toBe(false);
    expect(limited('ip', 500)).toBe(true); // 2 within 1s
    expect(limited('ip', 1600)).toBe(false); // first hit aged out → back under the cap
  });

  it('tracks keys (IPs) independently', () => {
    const limited = slidingWindowLimiter(1, 1000);
    expect(limited('a', 0)).toBe(false);
    expect(limited('b', 0)).toBe(false);
    expect(limited('a', 0)).toBe(true);
  });
});
