import 'server-only';
import { safeFetch } from './safe-fetch';

// Lightweight "weak website" heuristic — fetches the homepage HTML and flags signals of an
// outdated/poor site. Deliberately NOT a full Lighthouse/PageSpeed audit (that depth is the
// Audit subsystem); this just produces a rough 0-100 `site` score (lower = worse) to prioritize
// redesign-worthy leads during discovery.

export interface SiteAssessment {
  reachable: boolean;
  score: number; // 0-100, lower = weaker site
  flags: string[];
}

const FETCH_TIMEOUT_MS = 8000;

// SSRF-guarded fetch (validates the host + every redirect hop — the URL is directory data fetched from
// inside the Docker network).
async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; finalUrl: string }> {
  const { res, finalUrl } = await safeFetch(url, {
    timeoutMs: FETCH_TIMEOUT_MS,
    headers: { 'User-Agent': 'AgentsVerseBot/1.0 (+website audit)' },
  });
  const html = await res.text();
  return { ok: res.ok, html, finalUrl };
}

export async function assessWebsite(url: string): Promise<SiteAssessment> {
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  let html = '';
  let finalUrl = normalized;
  try {
    const r = await fetchHtml(normalized);
    if (!r.ok) return { reachable: false, score: 25, flags: ['unreachable'] };
    html = r.html;
    finalUrl = r.finalUrl;
  } catch {
    return { reachable: false, score: 25, flags: ['unreachable'] };
  }

  const flags: string[] = [];
  const lower = html.toLowerCase();

  if (!finalUrl.startsWith('https://')) flags.push('no-https');
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) flags.push('no-viewport');
  if (!/(book|contact|call|get a quote|schedule|appointment|order)/i.test(lower)) flags.push('no-clear-cta');

  // Stale copyright: a year more than 2 behind is a strong "untended site" signal. The current
  // year is read at runtime (server action context) — passed in via the caller is overkill here.
  // Group the © / "copyright" alternation so BOTH forms capture the year — the old `©|copyright…(year)`
  // matched a bare `©` with no year group (→ NaN), which poisoned Math.max and made the flag never fire.
  const years = [...lower.matchAll(/(?:©|copyright)[^0-9]{0,10}(20\d{2})/g)]
    .map((m) => Number(m[1]))
    .filter(Number.isFinite);
  const newest = years.length ? Math.max(...years) : null;
  const currentYear = new Date().getFullYear();
  if (newest !== null && currentYear - newest >= 2) flags.push('stale-copyright');

  if (html.length < 1500) flags.push('thin-content');
  if (/<table[^>]*>[\s\S]*<table/i.test(html)) flags.push('table-layout');

  // Start from a decent baseline; each flag docks points. Floor at 12 so a reachable-but-weak
  // site still scores above an unreachable one.
  const score = Math.max(12, 72 - flags.length * 12);
  return { reachable: true, score, flags };
}
