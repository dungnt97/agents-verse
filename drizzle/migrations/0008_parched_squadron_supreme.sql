CREATE TABLE "audit_screenshots" (
	"lead_id" text PRIMARY KEY NOT NULL,
	"png" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_screenshots" ADD CONSTRAINT "audit_screenshots_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;