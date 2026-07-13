import { slidingWindowLimiter } from './chat-rate-limit';

// Bounds how many inbound replies for a given lead trigger a (paid) Closer call + a doNotContact-eligible
// "STOP". The inbound webhooks verify that Resend/Meta FORWARDED the message (HMAC over the body), but not
// that the sender is genuine — the email From / phone is spoofable by anyone who knows a lead's contact. A
// spoofer could otherwise burn Closer spend or grief a lead into do-not-contact. Per-lead + global caps,
// in-memory on a single VPS (resets on restart — best-effort, mirroring the /api/chat guard). Not distributed.
const perLead = slidingWindowLimiter(Number(process.env.INBOUND_PER_LEAD_MAX) || 5, 10 * 60_000);
const globalCap = slidingWindowLimiter(Number(process.env.INBOUND_GLOBAL_MAX) || 60, 10 * 60_000);

// True when this inbound reply for `leadId` should be DROPPED (over the per-lead OR global window). Both
// counters advance on every call so the attempt always counts. `now` is injected for testability.
export function inboundRateLimited(leadId: string, now: number): boolean {
  const overGlobal = globalCap('inbound', now);
  const overLead = perLead(leadId, now);
  return overGlobal || overLead;
}
