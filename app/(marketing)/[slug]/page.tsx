/* =========================================================================
   AGENTS VERSE — Dynamic info route /[slug]
   Server component: validates slug, generates static params + metadata.
   Delegates rendering to a client wrapper that wires router + demo modal.
   Wrapped in MarketingFrame so ChatWidget + DemoRequestModal are present
   (matches the INFO branch in app.jsx which includes both widgets).
   ========================================================================= */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
// Import slugs from the plain (non-client) module — server components cannot
// import 'use client' files in their static data paths (generateStaticParams).
import { INFO_PAGES } from '@/lib/info-slugs';
import { InfoPageClientWrapper } from './info-page-client-wrapper';

/* Title copy per slug — self-contained, no external dependency */
const PAGE_TITLES: Record<string, string> = {
  about:      'About — Agents Verse',
  careers:    'Careers — Agents Verse',
  contact:    'Contact — Agents Verse',
  cases:      'Case Studies — Agents Verse',
  guarantees: 'Guarantees — Agents Verse',
  status:     'System Status — Agents Verse',
  privacy:    'Privacy Policy — Agents Verse',
  terms:      'Terms of Service — Agents Verse',
  security:   'Security — Agents Verse',
};

/** Pre-render all 9 info slugs at build time. */
export function generateStaticParams() {
  return INFO_PAGES.map((slug) => ({ slug }));
}

/** Per-page <title> tag. params is a Promise in Next.js 15+. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGE_TITLES[slug] ?? 'Agents Verse' };
}

export default async function InfoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Unknown slug → 404. INFO_PAGES is readonly string[] so cast for includes().
  if (!(INFO_PAGES as readonly string[]).includes(slug)) notFound();

  return <InfoPageClientWrapper slug={slug} />;
}
