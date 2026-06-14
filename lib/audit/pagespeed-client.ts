// PageSpeed Insights (Lighthouse-as-a-service) client. Supplies the performance-side audit
// dims: speed, seo, mobile. Accessibility + best-practices feed problems[] (not their own dim).
// Worker-only at runtime, but pure fetch — no node-only deps, no `server-only` (the worker runs
// this under tsx, where `server-only` would throw).

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface PageSpeedResult {
  speed: number; // 0-100
  seo: number;
  mobile: number;
  problems: string[];
  categoryScores: {
    performance: number | null;
    seo: number | null;
    accessibility: number | null;
    bestPractices: number | null;
  };
}

interface PsiCategory { score?: number | null }
interface PsiAudit { title?: string; score?: number | null }
interface PsiResponse {
  lighthouseResult?: {
    categories?: Record<string, PsiCategory>;
    audits?: Record<string, PsiAudit>;
  };
}

// Separate key by design; falls back to the Maps key (same project with PageSpeed API enabled).
function apiKey(): string {
  const key = process.env.GOOGLE_PAGESPEED_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_PAGESPEED_API_KEY (or GOOGLE_MAPS_API_KEY) is required for audit');
  return key;
}

async function withBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const exhausted = err instanceof Error && /RESOURCE_EXHAUSTED|429|rateLimit/i.test(err.message);
      if (!exhausted || attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      attempt += 1;
    }
  }
}

const to100 = (n: number | null): number => (n == null ? 50 : Math.round(n * 100));

export async function runPageSpeedAudit(url: string): Promise<PageSpeedResult> {
  const params = new URLSearchParams();
  params.set('url', url.startsWith('http') ? url : `https://${url}`);
  params.set('key', apiKey());
  params.set('strategy', 'mobile');
  // append (NOT set) so all four categories are sent.
  for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) params.append('category', c);

  const data = await withBackoff(() =>
    fetch(`${PSI_ENDPOINT}?${params.toString()}`).then(async (r) => {
      if (!r.ok) throw new Error(`PageSpeed ${r.status}: ${await r.text()}`);
      return r.json() as Promise<PsiResponse>;
    }),
  );

  const cats = data.lighthouseResult?.categories ?? {};
  const score = (k: string): number | null =>
    typeof cats[k]?.score === 'number' ? (cats[k].score as number) : null;
  const performance = score('performance');
  const seo = score('seo');
  const accessibility = score('accessibility');
  const bestPractices = score('best-practices');

  const speed = to100(performance);
  const seoDim = to100(seo);
  // "mobile experience" proxy: blend mobile-strategy performance with accessibility.
  const mobile =
    performance != null && accessibility != null
      ? Math.round(((performance + accessibility) / 2) * 100)
      : to100(performance);

  const audits = data.lighthouseResult?.audits ?? {};
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
}
