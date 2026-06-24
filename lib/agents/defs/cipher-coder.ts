// Cipher — frontend coder / delivery build-prep. After a deal is WON, it turns the generated demo into
// a delivery-ready page by producing tight SEO/OG metadata for the business. It returns STRUCTURED JSON
// only (title/description/OG + keywords) — never a re-rendered page — so it sidesteps the large-HTML
// reliability ceiling; run-build injects the metadata + a deterministic JSON-LD/sitemap into the demo.
// Uses sonnet (a scoped metadata task, not a full opus build) for speed + reliable JSON. tsx-safe.
import { z } from 'zod';
import type { AgentDef } from '../types';
import { makeJsonValidator } from '../validators';

export const cipherOutputSchema = z.object({
  title: z.string().min(1).max(70), // <title> — brand + value, ~60 chars
  description: z.string().min(1).max(200), // meta description, ~150-160 chars
  ogTitle: z.string().min(1).max(70),
  ogDescription: z.string().min(1).max(200),
  keywords: z.array(z.string().min(1)).max(12),
});
export type CipherOutput = z.infer<typeof cipherOutputSchema>;

export interface CipherInput {
  company: string;
  industry: string;
  city: string;
  summary: string; // audit summary — what the redesign delivers
}

function buildCipherPrompt({ company, industry, city, summary }: CipherInput): string {
  return [
    `You are a technical SEO engineer preparing a freshly redesigned homepage for ${company}, a ${industry}`,
    `business in ${city}, to go live. Write concise, high-converting, NON-spammy search + social metadata.`,
    ``,
    `What the new site delivers: ${summary}`,
    ``,
    `Rules: title <= 60 chars (include the business name + its core value, no keyword stuffing);`,
    `description 140-160 chars, a clear benefit + a soft call-to-action; ogTitle/ogDescription tuned for a`,
    `social share card; 4-8 specific, relevant keywords (no generic filler). Write in the business's likely`,
    `customer language. No emoji, no quotes inside values that would break JSON.`,
    ``,
    `Output STRICT JSON ONLY — no prose, no markdown fence:`,
    `{ "title": "", "description": "", "ogTitle": "", "ogDescription": "", "keywords": ["", ""] }`,
  ].join('\n');
}

export const cipherCoder: AgentDef<CipherInput, CipherOutput> = {
  id: 'cipher',
  role: 'Delivery build-prep — SEO/OG metadata for the won deal’s site',
  model: 'sonnet',
  tools: [],
  limits: { timeoutMs: 120_000, maxTurns: 1 },
  buildPrompt: buildCipherPrompt,
  validate: makeJsonValidator(cipherOutputSchema),
};
