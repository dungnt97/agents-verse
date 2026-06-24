// Tiny in-memory sliding-window rate limiter for the public /api/chat endpoint (best-effort abuse guard
// on a single VPS; state resets on restart, which is fine here). Pure factory — `now` is injected so the
// window logic is unit-testable. Not for distributed rate limiting.
export function slidingWindowLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  // Returns true when `key` has EXCEEDED `max` requests within the trailing window (this call counts).
  return function limited(key: string, now: number): boolean {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    return recent.length > max;
  };
}
