ALTER TABLE "leads" DROP CONSTRAINT "leads_company_unique";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "do_not_contact" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_company_manual_unique" ON "leads" USING btree ("company") WHERE "leads"."place_id" is null;