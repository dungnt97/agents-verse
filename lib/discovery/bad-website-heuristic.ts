import 'server-only';

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

async function fetchHtml(url: string): Promise<{ ok: boolean; html: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'AgentsVerseBot/1.0 (+website audit)' },
    });
    const html = await res.text();
    return { ok: res.ok, html, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
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
  const years = [...lower.matchAll(/©|copyright[^0-9]{0,10}(20\d{2})/g)].map((m) => Number(m[1]));
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
