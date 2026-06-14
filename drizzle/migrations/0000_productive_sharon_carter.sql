CREATE TYPE "public"."autonomy_mode" AS ENUM('manual', 'review', 'guarded', 'full');--> statement-breakpoint
CREATE TYPE "public"."deal_stage" AS ENUM('pricing', 'created', 'quoted', 'approval', 'call', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."demo_status" AS ENUM('review', 'approved', 'sent', 'replied', 'won', 'draft', 'none');--> statement-breakpoint
CREATE TYPE "public"."lead_stage" AS ENUM('found', 'audited', 'demo', 'contacted', 'replied', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."req_status" AS ENUM('new', 'reviewing', 'contacted', 'converted', 'declined');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"room" text NOT NULL,
	"status" text NOT NULL,
	"conf" integer NOT NULL,
	"tasks" integer NOT NULL,
	"quality" integer NOT NULL,
	"cost" real NOT NULL,
	"task" text NOT NULL,
	"hue" integer NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"purpose" text NOT NULL,
	"status" text NOT NULL,
	"agents" jsonb NOT NULL,
	"active" integer NOT NULL,
	"running" integer NOT NULL,
	"done" integer NOT NULL,
	"health" integer NOT NULL,
	"mission" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"pos" text
);
--> statement-breakpoint
CREATE TABLE "demo_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"business" text NOT NULL,
	"url" text NOT NULL,
	"industry" text NOT NULL,
	"city" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"t" text NOT NULL,
	"status" "req_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"industry" text NOT NULL,
	"city" text NOT NULL,
	"url" text NOT NULL,
	"site" integer NOT NULL,
	"score" integer NOT NULL,
	"value" integer NOT NULL,
	"agent" text NOT NULL,
	"stage" "lead_stage" NOT NULL,
	"demo" "demo_status" NOT NULL,
	"place_id" text,
	"website_uri" text,
	"formatted_address" text,
	"lat" double precision,
	"lng" double precision,
	"business_status" text,
	"primary_type" text,
	"email" text,
	"phone" text,
	"website_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leads_place_id_unique" UNIQUE("place_id")
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"lead_id" text PRIMARY KEY NOT NULL,
	"scores" jsonb NOT NULL,
	"problems" jsonb NOT NULL,
	"redesign" jsonb NOT NULL,
	"confidence" integer NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"client" text NOT NULL,
	"industry" text NOT NULL,
	"city" text NOT NULL,
	"pkg" text NOT NULL,
	"price" integer NOT NULL,
	"value" integer NOT NULL,
	"probability" integer NOT NULL,
	"stage" "deal_stage" NOT NULL,
	"esc_reason" text,
	"ai_rec" text NOT NULL,
	"conf" integer NOT NULL,
	"reply" jsonb NOT NULL,
	"production" jsonb
);
--> statement-breakpoint
CREATE TABLE "demos" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"business" text NOT NULL,
	"industry" text NOT NULL,
	"city" text NOT NULL,
	"url" text NOT NULL,
	"old_score" integer NOT NULL,
	"new_score" integer NOT NULL,
	"status" "demo_status" NOT NULL,
	"status_label" text NOT NULL,
	"status_cls" text NOT NULL,
	"agents" jsonb NOT NULL,
	"generated" text NOT NULL,
	"demo_url" text NOT NULL,
	"client_status" text NOT NULL,
	"value" integer NOT NULL,
	"changes" jsonb NOT NULL,
	"notes" text NOT NULL,
	"checklist" jsonb NOT NULL,
	"outreach" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" integer NOT NULL,
	"t" text NOT NULL,
	"agent" text NOT NULL,
	"room" text NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalations" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"sev" text NOT NULL,
	"title" text NOT NULL,
	"who" text NOT NULL,
	"value" integer NOT NULL,
	"agent" text NOT NULL,
	"reason" text NOT NULL,
	"rec" text NOT NULL,
	"conf" integer NOT NULL,
	"time" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"scanned" integer NOT NULL,
	"leads" integer NOT NULL,
	"demos" integer NOT NULL,
	"outreach" integer NOT NULL,
	"replies" integer NOT NULL,
	"won" integer NOT NULL,
	"forecast" integer NOT NULL,
	"cost" real NOT NULL,
	"cost_limit" integer NOT NULL,
	"escalations" integer NOT NULL,
	"online" integer NOT NULL,
	"in_progress" integer NOT NULL,
	"completed" integer NOT NULL,
	"margin" integer NOT NULL,
	"net_profit" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"autonomy_mode" "autonomy_mode" DEFAULT 'guarded' NOT NULL,
	"guardrails" jsonb,
	"pricing" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_room_rooms_id_fk" FOREIGN KEY ("room") REFERENCES "public"."rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demos" ADD CONSTRAINT "demos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;