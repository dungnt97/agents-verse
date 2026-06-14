CREATE TYPE "public"."escalation_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "status" "escalation_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "resolved_at" timestamp;