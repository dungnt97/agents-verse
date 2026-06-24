// Per-agent estimated cost per completed unit (USD). The subscription has no per-token bill, so these
// are ESTIMATES for the dashboard's per-agent spend gauge — derived from the plan's blended model rates
// (opus ≈ $0.30, sonnet ≈ $0.08, haiku ≈ $0.01 per run-equivalent). Pure/client-safe; founder reference
// only, never an invoice. Only agents with a real, countable unit are overlaid; the rest keep seed cost.
export const AGENT_UNIT_RATE: Record<string, number> = {
  orion: 0.01, // haiku — per discovered lead
  vega: 0.02, // gemini — per audit
  atlas: 0.08, // opus — per demo (brand spec pass)
  nova: 0.1, // opus — per demo (build pass)
  iris: 0.06, // opus — per demo (UX review)
  kira: 0.04, // opus — per audit/demo (visual QA)
  cipher: 0.1, // opus — per delivery build
  echo: 0.08, // sonnet — per outreach email
};

// Round a USD estimate to cents.
export function estCost(units: number, agentId: string): number | undefined {
  const rate = AGENT_UNIT_RATE[agentId];
  if (rate === undefined) return undefined;
  return Math.round(Math.max(0, units) * rate * 100) / 100;
}
