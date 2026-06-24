// Mira — client support / onboarding agent. After a deal is WON, she writes a warm Vietnamese
// onboarding email that thanks the client and requests the assets needed to start production (logo,
// brand colors, photos, copy, business hours). Output is zod-validated { subject, body }. tsx-safe:
// relative imports, no `server-only`.
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
}

function buildMiraPrompt({ client, industry, city, pkg }: MiraInput): string {
  return [
    `You are the client-success lead at a web-design agency in ${city}, Vietnam. ${client}, a ${industry}`,
    `business, just signed for the "${pkg}" package. Write a SHORT warm Vietnamese ONBOARDING email that:`,
    `thanks them, sets a friendly tone, and asks for the assets you need to start building their real site —`,
    `logo (vector if possible), brand colors, 4-6 photos, key page copy / services, business hours, and any`,
    `existing domain. Make the ask a clear, scannable checklist.`,
    ``,
    `Tone: warm, professional, concise. 90-140 words in the body. No emoji. Do NOT invent a price, a date,`,
    `a contact person's name, or a portal link (none exists yet).`,
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
