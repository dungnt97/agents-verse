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
}
