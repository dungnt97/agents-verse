// Provider dispatch for the performance-side audit (speed/seo/mobile + problems). Both paths run the
// SAME Lighthouse engine and return the SAME PageSpeedResult, so the audit pipeline is provider-agnostic.
//   pagespeed  → Google's HOSTED Lighthouse (PageSpeed Insights) — needs a Google API key + GCP billing.
//   lighthouse → Lighthouse run LOCALLY in the worker's Chromium — needs no Google at all.
// AUDIT_PROVIDER forces a choice; unset auto-picks pagespeed when a Google key exists, else lighthouse,
// so audits work with zero Google setup. Worker-only (relative imports, no `server-only`).
import { runPageSpeedAudit, type PageSpeedResult } from './pagespeed-client';
import { runLighthouseAudit } from './lighthouse-client';

export function runPerformanceAudit(url: string): Promise<PageSpeedResult> {
  const explicit = (process.env.AUDIT_PROVIDER || '').trim().toLowerCase();
  const hasGoogleKey = !!(process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_MAPS_API_KEY);
  const provider = explicit || (hasGoogleKey ? 'pagespeed' : 'lighthouse');
  return provider === 'lighthouse' ? runLighthouseAudit(url) : runPageSpeedAudit(url);
}
