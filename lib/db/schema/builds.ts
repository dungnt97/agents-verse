import { pgTable, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { leads } from './leads';

// Delivery build for a WON deal's lead: the generated demo HTML optimized for hand-off (SEO/OG/JSON-LD
// injected into <head>) plus the derived sitemap/robots. Keyed by leadId — one current build per lead;
// a re-run overwrites it. Decoupled from `pipeline_runs` on purpose: deals aren't run-tracked, so the
// build is driven by the `deal/won` event rather than the lead-acquisition funnel.
export interface BuildMeta {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string[];
  sitemap: string; // sitemap.xml body
  robots: string; // robots.txt body
}

export const builds = pgTable('builds', {
  leadId: text('lead_id')
    .primaryKey()
    .references(() => leads.id, { onDelete: 'cascade' }),
  dealId: text('deal_id'),
  html: text('html'), // delivery-optimized HTML; null until the first successful build
  meta: jsonb('meta').$type<BuildMeta>(),
  status: text('status').notNull(), // 'building' | 'ready' | 'failed'
  error: text('error'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
