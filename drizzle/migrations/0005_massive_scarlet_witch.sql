CREATE TABLE "generated_demos" (
	"lead_id" text PRIMARY KEY NOT NULL,
	"html" text,
	"status" text NOT NULL,
	"error" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_demos" ADD CONSTRAINT "generated_demos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;