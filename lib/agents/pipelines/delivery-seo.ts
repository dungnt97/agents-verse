// Pure delivery build-prep helpers (no I/O, tsx-safe: relative imports, no `server-only`). Cipher returns
// SEO/OG metadata as JSON; these inject it into the generated demo's <head> and derive a JSON-LD block,
// sitemap, and robots.txt deterministically. Kept separate from the worker fn so they're unit-testable.
import type { CipherOutput } from '../defs/cipher-coder';

// Escape a value for safe interpolation into an HTML attribute / text node.
export function escAttr(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

// Honest, derived metadata used when the Cipher LLM call is unavailable (no token) or fails — the build
// still ships with real SEO rather than nothing.
export function fallbackMeta(company: string, industry: string, city: string, summary: string): CipherOutput {
  const title = `${company} — ${industry} in ${city}`.slice(0, 70);
  const description = (summary || `${company}: a faster, mobile-first ${industry} website.`).slice(0, 160);
  return { title, description, ogTitle: title, ogDescription: description, keywords: [industry, city, company].filter(Boolean) };
}

// Minimal schema.org LocalBusiness JSON-LD. `<` is escaped so the string can't break out of <script>.
export function localBusinessJsonLd(company: string, industry: string, city: string, url: string): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company,
    description: `${industry} in ${city}`.trim(),
    ...(url ? { url } : {}),
    address: { '@type': 'PostalAddress', addressLocality: city },
  }).replace(/</g, '\\u003c');
}

// Inject the metadata block at the start of <head> (replacing the demo's generic <title>). Falls back to
// synthesising a <head> if the document has none.
export function injectSeo(html: string, meta: CipherOutput, jsonLd: string, canonical: string): string {
  const head = [
    `<title>${escAttr(meta.title)}</title>`,
    `<meta name="description" content="${escAttr(meta.description)}">`,
    `<meta name="keywords" content="${escAttr(meta.keywords.join(', '))}">`,
    `<meta property="og:title" content="${escAttr(meta.ogTitle)}">`,
    `<meta property="og:description" content="${escAttr(meta.ogDescription)}">`,
    `<meta property="og:type" content="website">`,
    canonical ? `<link rel="canonical" href="${escAttr(canonical)}">` : '',
    `<script type="application/ld+json">${jsonLd}</script>`,
  ]
    .filter(Boolean)
    .join('\n');

  const out = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  if (/<head[^>]*>/i.test(out)) return out.replace(/(<head[^>]*>)/i, `$1\n${head}`);
  if (/<html[^>]*>/i.test(out)) return out.replace(/(<html[^>]*>)/i, `$1\n<head>\n${head}\n</head>`);
  return `<head>\n${head}\n</head>\n${out}`;
}

export function sitemapXml(canonical: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escAttr(canonical)}</loc></url>\n</urlset>`;
}

export function robotsTxt(canonical: string): string {
  const sitemap = canonical ? `${canonical.replace(/\/$/, '')}/sitemap.xml` : '';
  return ['User-agent: *', 'Allow: /', sitemap ? `Sitemap: ${sitemap}` : ''].filter(Boolean).join('\n');
}
