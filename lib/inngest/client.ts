import { Inngest } from 'inngest';

// Shared Inngest client. Imported by BOTH the web app (to `send` events) and the worker
// (to register + run functions via connect()). Must stay free of node-only / server-only deps
// so it's safe in either runtime. Config from env: INNGEST_BASE_URL points at the self-hosted
// Inngest server; INNGEST_EVENT_KEY required when INNGEST_DEV=0.
export const inngest = new Inngest({
  id: 'agents-verse',
  isDev: process.env.INNGEST_DEV === '1',
  baseUrl: process.env.INNGEST_BASE_URL,
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Event payload contract for `audit/requested` (typed at the call sites via casts; the v4
// schema helpers need zod, which we intentionally don't add for one event).
export interface AuditRequestedData {
  leadId: string;
  // Present when the audit is part of an orchestrated pipeline run; absent for a one-off manual
  // audit. The worker echoes it on `audit/completed` so the orchestrator can advance the run.
  runId?: string;
}

// Event payload contract for `demo/requested` — generate a redesign demo page for an audited lead.
export interface DemoRequestedData {
  leadId: string;
  // Present when emitted by the orchestrator (auto-hop from audit); absent for a manual demo run.
  runId?: string;
}

// Fact events a worker step emits when it finishes — consumed ONLY by orchestrate-pipeline to
// decide the next hop. `outcome` lets a single fact carry success or terminal failure (workers
// emit the failure variant from their Inngest `onFailure` handler, after retries are exhausted).
export interface PipelineFactData {
  runId: string;
  leadId: string;
  outcome: 'ok' | 'failed';
}

// The fact event names the orchestrator listens for (single contract reference for the worker fns).
// `outreach/sent` doubles as the funnel's closing fact (the run completes once the email goes out).
export type PipelineFactName = 'audit/completed' | 'demo/completed' | 'outreach/sent';

// Founder control events emitted by the escalations actions when a pipeline-gate escalation is
// approved (resumed → release the held hop) or rejected (halted → terminate the run). The
// orchestrator listens for these alongside the fact events and routes them through the machine.
export interface PipelineControlData {
  runId: string;
}
export type PipelineControlName = 'pipeline/resumed' | 'pipeline/halted';

// A client's reply to an outreach/demo, ingested by the founder pasting it (inbound webhook is a later
// phase). The Closer worker interprets it and advances or escalates the linked deal.
export interface ReplyReceivedData {
  dealId: string;
  leadId?: string;
  text: string;
}

// Outreach (Echo): requested = compose + (gate or send) the demo-offer email for a lead; approved =
// the founder okayed a gated draft, send it; sent = the fact emitted once the email actually went out.
export interface OutreachRequestedData {
  leadId: string;
  runId?: string;
}
export interface OutreachApprovedData {
  leadId: string;
  subject: string;
  body: string;
  // Carried through from the parked draft's escalation so the resulting `outreach/sent` can advance the
  // originating pipeline run (absent for a one-off manual outreach with no run behind it).
  runId?: string;
}
// Emitted once the email actually goes out. Doubles as the pipeline's closing fact: `outcome:'ok'`
// completes the run; `outcome:'failed'` (e.g. nothing to send) fails it so it can't strand at 'outreach'.
export interface OutreachSentData {
  leadId: string;
  runId?: string;
  outcome?: 'ok' | 'failed';
}

// A deal closed `won` — emitted by every close path (founder approval, direct stage advance, or the
// Closer's full-autonomy auto-close), id-deduped per deal. Drives the post-sale delivery subsystems:
// Cipher build-prep (run-build) and Mira onboarding (run-support). Decoupled from `pipeline_runs`.
export interface DealWonData {
  dealId: string;
  leadId: string;
}

// Cipher finished a delivery build for a won deal's lead (SEO/OG-optimized site ready to hand off).
export interface DeliveryCompletedData {
  leadId: string;
  dealId: string;
}

// Mira onboarding: the founder approved a parked onboarding draft → send the asset-request email.
export interface SupportApprovedData {
  leadId: string;
  subject: string;
  body: string;
}
