CREATE TABLE "hunted_markets" (
	"id" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"niche" text NOT NULL,
	"last_run_at" timestamp,
	"leads_found" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "market_plan" jsonb;