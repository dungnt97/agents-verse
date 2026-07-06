import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  doublePrecision,
  jsonb,
} from 'drizzle-orm/pg-core';
import { leadStageEnum, demoStatusEnum, reqStatusEnum } from './enums';
import type { MapsData } from '../../data/types';

export const leads = pgTable('leads', {
  // String id from the mock (e.g. 'atlas-d') so seeded FK references resolve unchanged.
  id: text('id').primaryKey(),
  // Unique so createLead / convertRequestToLead (insert … onConflictDoNothing) can't create a
  // second row for the same company even under concurrent calls.
  company: text('company').notNull().unique(),
  industry: text('industry').notNull(),
  city: text('city').notNull(),
  url: text('url').notNull(),
  site: integer('site').notNull(),
  score: integer('score').notNull(),
  value: integer('value').notNull(),
  agent: text('agent').notNull(),
  stage: leadStageEnum('stage').notNull(),
  demo: demoStatusEnum('demo').notNull(),

  // --- Google Places enrichment (Phase 8). Nullable: only discovery-sourced leads
  // carry these; mock/manual leads leave them null. placeId is unique so re-running
  // discovery upserts instead of duplicating.
  placeId: text('place_id').unique(),
  websiteUri: text('website_uri'),
  formattedAddress: text('formatted_address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  businessStatus: text('business_status'),
  primaryType: text('primary_type'),
  email: text('email'),
  phone: text('phone'),
  // Heuristic bad-website score (0-100) captured during discovery; distinct from `site`.
  websiteScore: real('website_score'),
  // Rich Maps facts (rating/reviews/hours/categories) captured from the scrape — fed to demo generation
  // so the demo uses real business facts instead of inventing them. Null for mock/manual leads.
  mapsData: jsonb('maps_data').$type<MapsData>(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const demoRequests = pgTable('demo_requests', {
  id: text('id').primaryKey(),
  business: text('business').notNull(),
  url: text('url').notNull(),
  industry: text('industry').notNull(),
  city: text('city').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  // Relative time label kept for UI fidelity ('12m ago'); createdAt is the real clock.
  t: text('t').notNull(),
  status: reqStatusEnum('status').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
