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
    `You are Cipher — a senior technical-SEO engineer preparing the freshly redesigned homepage for`,
    `${company}, a ${industry} business in ${city}, to go live. You write metadata that ranks for how`,
    `real local customers search and reads cleanly as a social share card.`,
    ``,
    `What the new site delivers: ${summary}`,
    ``,
    `Method: lead with the strongest local + service intent for a ${industry} in ${city}; put the business`,
    `name and its core value in the title; make the description a concrete benefit + a soft call-to-action;`,
    `tune ogTitle/ogDescription for a share card (punchier, benefit-first). Write in the customer's language.`,
    ``,
    `Rules (with the why): title <= 60 chars (longer truncates in results, include the business name + its`,
    `core value, no keyword stuffing); description 140-160 chars (the visible snippet window) with a clear`,
    `benefit + soft call-to-action; ogTitle/ogDescription tuned for a social share card; 4-8 specific keywords`,
    `mixing service + locality, no generic filler (search engines down-rank stuffing). No emoji, no quotes`,
    `inside values that would break JSON.`,
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
