// Detects an opt-out ("STOP") in an inbound reply so outreach can permanently suppress that lead. Pure +
// client-safe (no server-only, no imports) so it is shared by the worker (handle-reply) and unit-tested
// in isolation. Biased toward PRECISION over recall: a missed opt-out merely means the founder reviews the
// reply through the normal flow, whereas a FALSE positive wrongly marks a lead do-not-contact and loses it.

// The whole trimmed message equals one of these → opt-out.
const EXACT = new Set(['stop', 'stop all', 'unsubscribe', 'unsub', 'opt out', 'opt-out', 'remove me', 'cancel']);
// The message STARTS with one of these keywords (e.g. "stop emailing me", "unsubscribe please").
const STARTS = ['stop', 'unsubscribe', 'unsub'];
// Unambiguous opt-out phrases anywhere in the message.
const PHRASES = [
  'remove me from', 'take me off', 'opt me out', 'unsubscribe me',
  'stop emailing', 'stop messaging', 'stop texting', 'stop sending', 'stop contacting',
  'do not email', "don't email", 'do not contact', "don't contact",
  'no longer wish to receive', 'no longer want',
];
// The OPPOSITE of an opt-out — these flip the meaning of a "stop"/"keep" phrase and must never opt out.
const NEGATION = /\b(don'?t stop|do not stop|keep (sending|emailing|messaging|contacting))\b/;

export function isOptOut(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.!]+$/, '');
  if (!t) return false;
  if (NEGATION.test(t)) return false;
  if (EXACT.has(t)) return true;
  if (STARTS.some((k) => t === k || t.startsWith(k + ' '))) return true;
  return PHRASES.some((p) => t.includes(p));
}
