/* =========================================================================
   AGENTS VERSE — Canonical list of valid info page slugs.
   Kept in a plain (non-client) module so both the server component
   (generateStaticParams / notFound validation) and the client InfoPage
   component can import it without a 'use client' boundary conflict.
   ========================================================================= */

export const INFO_PAGES = [
  'about',
  'careers',
  'contact',
  'cases',
  'guarantees',
  'status',
  'privacy',
  'terms',
  'security',
] as const;

export type InfoSlug = (typeof INFO_PAGES)[number];
