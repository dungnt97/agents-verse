// Echo — outreach agent. Writes a short, personalized Vietnamese outreach email offering the free
// redesign demo, in the warm, no-pressure house tone (no-charge / no-obligation, concrete value, a
// soft ask). Output is zod-validated { subject, body } (= DemoOutreach). tsx-safe: relative imports,
// no `server-only`.
import { z } from 'zod';
import type { AgentDef } from '../types';
import { makeJsonValidator } from '../validators';

export const echoOutputSchema = z.object({
  subject: z.string().min(1).max(120),
  body: z.string().min(1),
});
export type EchoOutput = z.infer<typeof echoOutputSchema>;

export interface EchoInput {
  company: string;
  industry: string;
  city: string;
  cta: string; // the redesign's primary call-to-action (from the audit)
  summary: string; // audit summary — what the redesign fixes
}

function buildEchoPrompt({ company, industry, city, cta, summary }: EchoInput): string {
  return [
    `You are the outreach writer at a web-design agency in ${city}, Vietnam. Write a SHORT cold-outreach`,
    `email (Vietnamese) to ${company} (a ${industry} business) offering a FREE redesign demo of their`,
    `homepage we already built — no charge, no obligation.`,
    ``,
    `What the redesign delivers / fixes: ${summary}`,
    `Primary action the new site makes effortless: "${cta}".`,
    ``,
    `Tone: warm, human, concise, zero hard-sell or hype. Lead with concrete value, end with a soft ask`,
    `to take a look. 90-130 words in the body. Do NOT include a greeting line with a fake contact name,`,
    `a signature, a price, or the demo link (the system appends the link + unsubscribe). No emoji.`,
    ``,
    `Output STRICT JSON ONLY — no prose, no markdown fence:`,
    `{ "subject": "<a specific, non-spammy subject line, <= 60 chars>", "body": "<the email body, plain text, \\n between paragraphs>" }`,
  ].join('\n');
}

export const echoOutreach: AgentDef<EchoInput, EchoOutput> = {
  id: 'echo',
  role: 'Outreach — write the personalized demo-offer email',
  model: 'sonnet',
  tools: [],
  limits: { timeoutMs: 120_000, maxTurns: 1 },
  buildPrompt: buildEchoPrompt,
  validate: makeJsonValidator(echoOutputSchema),
};
