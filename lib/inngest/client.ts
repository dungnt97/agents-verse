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
export type PipelineFactName = 'audit/completed' | 'demo/completed';

// Founder control events emitted by the escalations actions when a pipeline-gate escalation is
// approved (resumed → release the held hop) or rejected (halted → terminate the run). The
// orchestrator listens for these alongside the fact events and routes them through the machine.
export interface PipelineControlData {
  runId: string;
}
export type PipelineControlName = 'pipeline/resumed' | 'pipeline/halted';
