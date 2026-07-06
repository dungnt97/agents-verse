// A lead is "contactable" when we have at least one way to actually SEND the demo — a phone (WhatsApp /
// Telegram / call) or an email. The autonomous pipeline skips the expensive demo generation for leads we
// can't reach, per the "only work with places that have contact info" rule. Worker-safe (no `server-only`,
// no framework imports): used by the web discovery action AND the pipeline worker.
export function hasContact(lead: { phone?: string | null; email?: string | null }): boolean {
  return !!lead.phone?.trim() || !!lead.email?.trim();
}
