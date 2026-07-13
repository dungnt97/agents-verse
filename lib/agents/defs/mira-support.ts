// Mira — client support / onboarding agent. After a deal is WON, she writes a warm onboarding email (in
// the client's own market language) that thanks the client and requests the assets needed to start
// production (logo, brand colors, photos, copy, business hours). Output is zod-validated { subject, body }.
// tsx-safe: relative imports, no `server-only`.
import { z } from 'zod';
import type { AgentDef } from '../types';
import { makeJsonValidator } from '../validators';

export const miraOutputSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(1),
});
export type MiraOutput = z.infer<typeof miraOutputSchema>;

export interface MiraInput {
  client: string;
  industry: string;
  city: string;
  pkg: string; // the package the client bought
  /** Language the onboarding email must be written in (the client's market language, e.g. "English"). */
  language: string;
}

function buildMiraPrompt({ client, industry, city, pkg, language }: MiraInput): string {
  return [
    `You are Mira — a senior client-success lead at a web-design agency serving ${city}. ${client}, a`,
    `${industry} business, just signed for the "${pkg}" package. Write a SHORT, warm ONBOARDING email in`,
    `${language} (the client's language) that makes them feel in great hands and gets production moving.`,
    ``,
    `The email should thank them genuinely, set a friendly confident tone, and ask — as a clear, scannable`,
    `checklist — for the assets you need to start building their real site: logo (vector if possible), brand`,
    `colors, 4-6 photos, key page copy / services, business hours, and any existing domain.`,
    ``,
    `Tone: warm, human, professional — varied sentence length, flowing prose around the checklist, no emoji,`,
    `no AI/template tells. 90-140 words in the body. Answer only from what you know: do NOT invent a price, a`,
    `date, a contact person's name, or a portal link (none exists yet) — if something is unknown, leave it out.`,
    ``,
    `Output STRICT JSON ONLY — no prose, no markdown fence:`,
    `{ "subject": "<a clear onboarding subject, <= 60 chars>", "body": "<the email body, plain text, \\n between paragraphs; use \\n- for checklist items>" }`,
  ].join('\n');
}

export const miraSupport: AgentDef<MiraInput, MiraOutput> = {
  id: 'mira',
  role: 'Client onboarding — request the assets to start production',
  model: 'sonnet',
  tools: [],
  limits: { timeoutMs: 120_000, maxTurns: 1 },
  buildPrompt: buildMiraPrompt,
  validate: makeJsonValidator(miraOutputSchema),
};
