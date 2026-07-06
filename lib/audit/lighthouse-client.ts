// Self-hosted Lighthouse — the same engine PageSpeed Insights runs, but executed locally in the worker
// instead of Google's hosted API, so the performance-side audit (speed/seo/mobile + problems) needs NO
// Google API key or Cloud billing. Returns the SAME PageSpeedResult shape as pagespeed-client, so the
// rest of the audit (map-audit-result) is unchanged.
//
// WORKER-ONLY: lighthouse, chrome-launcher and playwright are dynamically imported (kept out of the web
// bundle) and cast to minimal structural types so the web build/typecheck never depends on lighthouse's
// heavy ESM type surface. Chrome comes from the worker's Playwright image (chromePath below).
import type { PageSpeedResult } from './pagespeed-client';

// Minimal structural views of the three worker-only modules (real types resolve at runtime).
interface Lhr {
  categories?: Record<string, { score?: number | null }>;
  audits?: Record<string, { title?: string; score?: number | null }>;
}
type LighthouseFn = (url: string, flags: Record<string, unknown>) => Promise<{ lhr: Lhr } | undefined>;
interface ChromeInstance {
  port: number;
  kill(): unknown; // some chrome-launcher versions return void, others a Promise — normalise at the call site
}
interface ChromeLauncher {
  launch(opts: Record<string, unknown>): Promise<ChromeInstance>;
}

const to100 = (n: number | null): number => (n == null ? 50 : Math.round(n * 100));

export async function runLighthouseAudit(url: string): Promise<PageSpeedResult> {
  const target = url.startsWith('http') ? url : `https://${url}`;

  const { chromium } = (await import('playwright')) as unknown as { chromium: { executablePath(): string } };
  const chromeLauncher = (await import('chrome-launcher')) as unknown as ChromeLauncher;
  const lighthouse = ((await import('lighthouse')) as unknown as { default: LighthouseFn }).default;

  // Launch the worker's own Chromium (from the Playwright image) headless; chrome-launcher picks a free
  // debug port that Lighthouse then drives. --no-sandbox is required to run Chromium as root in Docker.
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    // Mobile form factor mirrors PageSpeed's strategy=mobile so scores are comparable to the hosted path.
    const result = await lighthouse(target, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'seo', 'accessibility', 'best-practices'],
      formFactor: 'mobile',
    });
    const lhr = result?.lhr;
    if (!lhr) throw new Error('lighthouse returned no result');

    // Identical mapping to pagespeed-client (PSI IS Lighthouse, same categories/audits shape).
    const cats = lhr.categories ?? {};
    const score = (k: string): number | null => (typeof cats[k]?.score === 'number' ? (cats[k].score as number) : null);
    const performance = score('performance');
    const seo = score('seo');
    const accessibility = score('accessibility');
    const bestPractices = score('best-practices');

    const speed = to100(performance);
    const seoDim = to100(seo);
    const mobile =
      performance != null && accessibility != null
        ? Math.round(((performance + accessibility) / 2) * 100)
        : to100(performance);

    const audits = lhr.audits ?? {};
    const problems = Object.values(audits)
      .filter((a) => typeof a.score === 'number' && a.score < 0.5 && a.title)
      .map((a) => a.title as string)
      .slice(0, 5);

    return {
      speed,
      seo: seoDim,
      mobile,
      problems,
      categoryScores: { performance, seo, accessibility, bestPractices },
    };
  } finally {
    try {
      await Promise.resolve(chrome.kill()); // works whether kill() returns void or a Promise
    } catch {
      /* best-effort cleanup */
    }
  }
}
