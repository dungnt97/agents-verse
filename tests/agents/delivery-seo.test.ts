import { describe, it, expect } from 'vitest';
import {
  injectSeo,
  fallbackMeta,
  localBusinessJsonLd,
  sitemapXml,
  robotsTxt,
} from '@/lib/agents/pipelines/delivery-seo';

const meta = {
  title: 'Atlas Dental — Houston',
  description: 'Modern dental care in Houston.',
  ogTitle: 'Atlas Dental',
  ogDescription: 'Book online in seconds.',
  keywords: ['dentist', 'houston'],
};

describe('injectSeo', () => {
  it('replaces the demo title and injects metadata + JSON-LD into <head>', () => {
    const html = '<!doctype html><html><head><title>Demo</title></head><body>hi</body></html>';
    const out = injectSeo(html, meta, '{"@type":"LocalBusiness"}', 'https://x.test/demo/atlas-d');
    expect(out).toContain('<title>Atlas Dental — Houston</title>');
    expect(out).not.toContain('<title>Demo</title>');
    expect(out).toContain('<meta name="description" content="Modern dental care in Houston.">');
    expect(out).toContain('property="og:title"');
    expect(out).toContain('rel="canonical" href="https://x.test/demo/atlas-d"');
    expect(out).toContain('application/ld+json');
  });

  it('synthesises a <head> when the document has none', () => {
    const out = injectSeo('<html><body>x</body></html>', meta, '{}', '');
    expect(out).toContain('<head>');
    expect(out).toContain('<title>Atlas Dental — Houston</title>');
  });

  it('escapes attribute-breaking characters in metadata', () => {
    const out = injectSeo('<head></head>', { ...meta, description: 'a "quote" & <tag>' }, '{}', '');
    expect(out).toContain('&quot;quote&quot;');
    expect(out).toContain('&amp;');
    expect(out).not.toContain('"quote"');
  });
});

describe('fallbackMeta', () => {
  it('derives honest metadata and clamps title to 70 / description to 160 chars', () => {
    const m = fallbackMeta('A'.repeat(80), 'Dentistry', 'Houston', 'B'.repeat(200));
    expect(m.title.length).toBeLessThanOrEqual(70);
    expect(m.description.length).toBeLessThanOrEqual(160);
    expect(m.ogTitle).toBe(m.title);
    expect(m.keywords).toContain('Houston');
  });
});

describe('localBusinessJsonLd', () => {
  it('emits LocalBusiness JSON with < escaped so it cannot break out of <script>', () => {
    const ld = localBusinessJsonLd('Atlas<script>', 'Dentistry', 'Houston', 'https://x.test');
    expect(ld).toContain('"@type":"LocalBusiness"');
    expect(ld).not.toContain('<script>');
    expect(ld).toContain('\\u003c');
  });
});

describe('sitemapXml / robotsTxt', () => {
  it('includes the canonical URL and a sitemap reference', () => {
    expect(sitemapXml('https://x.test/demo/atlas-d')).toContain('<loc>https://x.test/demo/atlas-d</loc>');
    const robots = robotsTxt('https://x.test/demo/atlas-d');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Sitemap: https://x.test/demo/atlas-d/sitemap.xml');
  });
});
