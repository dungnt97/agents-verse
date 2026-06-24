CREATE TABLE "builds" (
	"lead_id" text PRIMARY KEY NOT NULL,
	"deal_id" text,
	"html" text,
	"meta" jsonb,
	"status" text NOT NULL,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;