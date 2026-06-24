// Ledger cost meter. The subscription has no per-token billing, so spend is ESTIMATED, not billed:
// (pipeline runs in the window) × a configurable per-run rate, compared to a daily cap. Pure and
// client-safe (no server-only / no I/O) so the dashboard, the worker, and unit tests share one source
// of truth. Always presented as an estimate, never as an invoice.

// Blended per-run estimate (a run is opus-heavy: audit is ~free, demo gen runs several opus passes).
// Founder-overridable via settings.guardrails.costPerRun.
export const DEFAULT_COST_PER_RUN = 0.4; // USD
export const DEFAULT_DAILY_CAP = 50; // USD/day; override via settings.guardrails.dailyCostLimit
export const COST_ALERT_FRACTION = 0.8; // raise a cost escalation at 80% of the cap

export interface CostMeter {
  runs: number;
  costPerRun: number;
  estimatedCost: number;
  dailyCap: number;
  fractionUsed: number; // estimatedCost / dailyCap (0..n)
  nearCap: boolean; // >= 80% — surface a cost escalation
  overCap: boolean; // >= 100%
}

// Coerce a settings/guardrails value to a positive number, else fall back.
function positive(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

export function computeCostMeter(runs: number, opts?: { costPerRun?: unknown; dailyCap?: unknown }): CostMeter {
  const costPerRun = positive(opts?.costPerRun, DEFAULT_COST_PER_RUN);
  const dailyCap = positive(opts?.dailyCap, DEFAULT_DAILY_CAP);
  const safeRuns = Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 0;
  const estimatedCost = Math.round(safeRuns * costPerRun * 100) / 100;
  const fractionUsed = estimatedCost / dailyCap;
  return {
    runs: safeRuns,
    costPerRun,
    estimatedCost,
    dailyCap,
    fractionUsed,
    nearCap: fractionUsed >= COST_ALERT_FRACTION,
    overCap: fractionUsed >= 1,
  };
}
