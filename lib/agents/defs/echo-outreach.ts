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
    `You are Echo — a senior B2B outreach copywriter for a web-design agency in ${city}, Vietnam. Your`,
    `cold emails get replies because they open with something true about THIS business, not about us.`,
    `You are emailing ${company}, a ${industry} business, to offer a FREE redesign demo of their homepage`,
    `we already built — no charge, no obligation.`,
    ``,
    `What the redesign delivers / fixes: ${summary}`,
    `The one action the new site makes effortless: "${cta}".`,
    ``,
    `How to write it:`,
    `- Open with ONE specific, verifiable observation about ${company}'s current site or situation (drawn`,
    `  from the fixes above). A signal-first opener earns the read; a generic "I came across your business" does not.`,
    `- Then one line of concrete value (we already built a better version), then a soft ask to take a look.`,
    `- Pick the angle that fits: lead with the pain you noticed (PAS), or paint the before -> after (BAB).`,
    ``,
    `Tone: warm, human, concise — varied sentence length, flowing prose, no bullet lists, zero hard-sell.`,
    `Body UNDER 100 words. Exactly ONE soft call-to-action. No emoji. Avoid template/AI tells ("I hope this`,
    `email finds you", "Elevate", "Seamless", "Unleash", "in today's fast-paced world"). Do NOT add a`,
    `greeting with a fake name, a signature, a price, or the demo link (the system appends the link +`,
    `unsubscribe). Subject: <= 6 words, <= 60 chars, specific, not clickbait.`,
    ``,
    `Self-check before answering: if this could be sent to any ${industry} business unchanged, rewrite it`,
    `so it is unmistakably about ${company}.`,
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
