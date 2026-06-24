CREATE TYPE "public"."pipeline_run_status" AS ENUM('running', 'waiting_approval', 'paused', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('audit', 'demo', 'outreach', 'reply', 'deal', 'delivery');--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"stage" "pipeline_stage" DEFAULT 'audit' NOT NULL,
	"status" "pipeline_run_status" DEFAULT 'running' NOT NULL,
	"autonomy_snapshot" "autonomy_mode" NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "escalations" ADD COLUMN "run_id" text;--> statement-breakpoint
ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pipeline_runs_active_lead_idx" ON "pipeline_runs" USING btree ("lead_id") WHERE "pipeline_runs"."status" in ('running', 'waiting_approval', 'paused');--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE set null ON UPDATE no action;