// Worker-safe (no `server-only`) so the discovery cron can import it under tsx via run-discovery-core.
import * as cheerio from 'cheerio';
import { safeFetch } from './safe-fetch';

// Best-effort email sourcing (~50-70% hit rate). Parses mailto: links on the homepage and a
// /contact page. Never submits forms; a miss returns null (the lead falls back to phone/manual).

const FETCH_TIMEOUT_MS = 8000;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// SSRF-guarded (validates host + every redirect hop — the URL is directory data fetched from inside the
// Docker network). A blocked host / unreachable site throws → caught here → null (fall back to manual).
async function fetchText(url: string): Promise<string | null> {
  try {
    const { res } = await safeFetch(url, {
      timeoutMs: FETCH_TIMEOUT_MS,
      headers: { 'User-Agent': 'AgentsVerseBot/1.0 (+website audit)' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractEmail(html: string): string | null {
  const $ = cheerio.load(html);
  // Prefer explicit mailto: links (most reliable signal).
  const mailto = $('a[href^="mailto:"]').first().attr('href');
  if (mailto) {
    const addr = mailto.replace(/^mailto:/i, '').split('?')[0].trim();
    if (EMAIL_RE.test(addr)) return addr.toLowerCase();
  }
  // Fall back to a raw email pattern in the page text.
  const match = $('body').text().match(EMAIL_RE);
  return match ? match[0].toLowerCase() : null;
}

export async function scrapeEmail(url: string): Promise<string | null> {
  const base = url.startsWith('http') ? url : `https://${url}`;
  const home = await fetchText(base);
  if (home) {
    const fromHome = extractEmail(home);
    if (fromHome) return fromHome;
  }
  // Try a conventional /contact page before giving up.
  try {
    const contactUrl = new URL('/contact', base).toString();
    const contact = await fetchText(contactUrl);
    if (contact) return extractEmail(contact);
  } catch {
    /* malformed base URL — ignore */
  }
  return null;
}
