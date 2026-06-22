// Prompt builders for the multi-pass demo-generation engine. Pure (no runtime deps) so they are
// safe in the worker tsx chain. Pipeline: (1) creative-director spec → (2) build → (3) a niche-aware
// EXPERT REVIEW BOARD (UI/UX, copywriter, domain expert, art director) critiques the rendered
// screenshots → (4) synthesise fixes → (5) revise. The board is what pushes output past "good AI"
// to "a real studio shipped this", judged objectively against each discipline's and the niche's bar.
import type { AuditResult } from '../data/types';
import type { DesignDNA } from './art-direction';

export interface DemoGenInput {
  company: string;
  industry: string;
  city: string;
  url: string;
  scores: AuditResult['scores'];
  problems: string[];
  redesign: AuditResult['redesign'];
  summary: string;
}

// The tells that make a generated site read as "AI". Banned in the build pass.
const AI_TELLS = [
  'Everything centered / perfectly symmetric layouts with no editorial tension',
  'A generic three-stat bar (e.g. "500+ Projects · 99% Satisfaction · 24/7")',
  'Three identical evenly-spaced feature cards in a tidy row',
  'Blue→purple (or purple→pink) gradients and the default "modern SaaS" palette',
  'Default fonts (Poppins / Inter for headings everywhere) and a flat type scale',
  'Single flat drop-shadows instead of layered, optically-tuned shadows',
  'A row of circular testimonial avatars that all look the same',
  'Filler copy ("Elevate", "Seamless", "Empower", "Unlock") and vague platitudes',
  'Identical section rhythm — every band the same height/padding with no variation',
  'Emoji used as iconography; lorem ipsum or placeholder TODOs',
];

function clientBlock(input: DemoGenInput): string {
  const weakest = Object.entries(input.scores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([k, v]) => `${k} ${v}/100`)
    .join(', ');
  return [
    `CLIENT: ${input.company} — ${input.industry}, ${input.city}.`,
    `Current site we're replacing: ${input.url}`,
    `Audit summary: ${input.summary}`,
    `Weakest dimensions to visibly fix: ${weakest}.`,
    `Problems found:`,
    ...input.problems.map((p) => `- ${p}`),
    `Honor this brief from the audit — CTA "${input.redesign.cta}", tone "${input.redesign.content}", sections: ${input.redesign.sections.join(', ')}.`,
  ].join('\n');
}

function dnaBlock(dna: DesignDNA): string {
  return [
    `ART DIRECTION (commit fully to this — do not drift to a generic look):`,
    `- Aesthetic: ${dna.aesthetic}`,
    `- Palette: ${dna.palette}`,
    `- Fonts: ${dna.fonts}`,
    `- Layout archetype: ${dna.layout}`,
    `- Signature motif: ${dna.motif}`,
    `- Imagery: ${dna.imagery}`,
  ].join('\n');
}

// PASS 1 — Creative director. Output a tight, concrete design spec (text), not HTML.
export function buildDirectorPrompt(input: DemoGenInput, dna: DesignDNA): string {
  return [
    `You are the creative director at a top studio. Write a TIGHT, concrete design spec for a redesign landing page that will win this client. Decisiveness over options — pick exact values.`,
    ``,
    clientBlock(input),
    ``,
    dnaBlock(dna),
    ``,
    `Deliver a spec (markdown, ~250-400 words) covering:`,
    `1. The ONE memorable idea that makes this page feel bespoke (the hook a human designer would pitch).`,
    `2. Exact design tokens: every colour as hex, the 2 Google Fonts + weights, a fluid type scale (clamp values), a spacing scale, radius & shadow language.`,
    `3. The layout system: grid, margins, and how section rhythm VARIES (heights, alignment, full-bleed vs contained) to avoid monotony.`,
    `4. Section-by-section blueprint (in the audit's order) — what's in each, the one distinctive treatment per section, and the niche-essential functional elements a real ${input.industry} site must have.`,
    `5. Motion language: which elements animate and how (specific, not "fade in").`,
    `6. Copy voice + 3 example headlines in natural Vietnamese for ${input.city}.`,
    ``,
    `It must read as a confident human art-director's spec. Avoid these AI tells entirely:`,
    ...AI_TELLS.map((t) => `- ${t}`),
    ``,
    `Output ONLY the spec. No preamble.`,
  ].join('\n');
}

// Shared build/craft constraints used by the build and revise passes.
function craftConstraints(input: DemoGenInput): string {
  return [
    `BUILD AS: ONE complete, self-contained HTML5 document (doctype → </html>). All CSS in a single <style>; all JS in one <script> before </body>. Only external resources allowed: Google Fonts <link> and Unsplash images (https://images.unsplash.com/...).`,
    `CRAFT BAR: real responsive layout (mobile-first, flawless on phone + desktop); layered shadows; tracking on display type; WCAG-AA contrast; every <img> has descriptive alt + a working https://images.unsplash.com/photo-... URL and width/height or aspect-ratio to avoid layout shift. Interactive elements have visible hover/focus/active states.`,
    `SPACING SYSTEM (be disciplined — sloppy padding is the #1 tell of amateur work): define a spacing scale as CSS custom properties on a 4px base (e.g. --s1..--s12) and use ONLY those tokens for every padding/margin/gap — no ad-hoc pixel values. Consistent vertical section rhythm + container gutters; nothing touches the container/viewport edge; body text at a 45-75ch measure; align everything to the grid; NO accidental empty voids and NO empty/placeholder cards or trailing blank bands.`,
    `INTERACTIVITY: where the niche promises a tool (search, filter, "định giá"/quote, booking), implement a CONVINCING client-side mock in vanilla JS (compute a result locally from the inputs) — it must actually respond, not be decorative.`,
    `MOTION: tasteful, varied, vanilla — IntersectionObserver scroll reveals (staggered), animated number counters on scroll, hover micro-interactions, a sticky header that solidifies + blurs on scroll. Respect @media (prefers-reduced-motion: reduce). CRITICAL no-JS-safe reveal: put NO hidden-initial styles (opacity:0, visibility:hidden, hiding clip-path) in the base CSS. Add one class to <html> via an inline script at the very start of <body> — \`<script>document.documentElement.classList.add('js')</script>\` — and gate every hidden-initial reveal behind it (e.g. \`.js .reveal{opacity:0;transform:translateY(24px)}\`). Without JS ALL content is visible; JS only adds the entrance. NEVER hide <img>/media behind a clip-path or opacity:0 reveal — images MUST paint immediately on load (a demo has to SHOW complete imagery); reveal fades may apply to text/cards only. And add a JS FAILSAFE so nothing can ever stay hidden if an observer misfires: \`setTimeout(()=>document.querySelectorAll('.reveal,.mask,.in-view').forEach(e=>e.classList.add('in','is-visible')),1500)\`.`,
    `CONTENT: all copy in natural, fluent, specific Vietnamese for the ${input.city} market — realistic, factually-coherent names/listings/numbers (no contradictions, no defunct place names, no implausible figures), never lorem or "TODO". Keep the brand name "${input.company}". Make the primary conversion path obvious and the CTA "${input.redesign.cta}" unmissable; on mobile add a sticky primary-action bar where the niche expects it.`,
    `Output the ENTIRE document in this single response, ending with </html>. Do not stop early. Output ONLY raw HTML — no markdown fences, no commentary.`,
  ].join('\n');
}

// PASS 2 — Build the page from the spec.
export function buildBuildPrompt(input: DemoGenInput, dna: DesignDNA, spec: string): string {
  return [
    `You are a world-class front-end engineer building the page your creative director specced. Follow the spec EXACTLY — its palette, fonts, layout rhythm, motif and the one memorable idea.`,
    ``,
    `=== DESIGN SPEC ===`,
    spec,
    `=== END SPEC ===`,
    ``,
    clientBlock(input),
    ``,
    dnaBlock(dna),
    ``,
    `Avoid every one of these AI tells:`,
    ...AI_TELLS.map((t) => `- ${t}`),
    ``,
    craftConstraints(input),
  ].join('\n');
}

// PASS 3 — the expert review board. Each persona judges the rendered screenshots objectively
// against its own discipline's and the niche's standards (state the bar first, then findings).
export interface ReviewPersona {
  key: string;
  brief: (input: DemoGenInput) => string;
}

export const REVIEW_PERSONAS: ReviewPersona[] = [
  {
    key: 'uiux',
    brief: () =>
      `You are a SENIOR UI/UX DESIGNER (ex-top-agency, Awwwards juror). First STATE the objective standards you apply (visual hierarchy & focal flow, layout/grid discipline & alignment, one consistent spacing scale, typographic scale & rhythm, colour/contrast & WCAG, component states, affordances/interaction clarity, mobile usability & tap targets, conversion UX). Then list every concrete defect: element + viewport, the issue, why it matters professionally, severity (blocker/major/minor), and a specific fix. Be exacting about sloppy spacing, weak hierarchy, accidental empty voids, and clumsy mobile.`,
  },
  {
    key: 'copy',
    brief: (input) =>
      `You are a CONVERSION COPYWRITER & CONTENT STRATEGIST, native to the ${input.city} market. First STATE your standards (value-prop clarity, headline hook, message hierarchy & scannability, specificity vs vague fluff, CTA quality, trust/proof language, natural fluent Vietnamese tone for this niche). Then critique the ACTUAL copy on the page — headlines, subheads, section intros, card/agent/testimonial text, CTAs. Flag anything generic, AI-written, translated-sounding, exaggerated, factually incoherent, or unconvincing to a real local ${input.industry} customer. Give concrete Vietnamese rewrites as fixes, with severity.`,
  },
  {
    key: 'niche',
    brief: (input) =>
      `You are a ${input.industry.toUpperCase()} DOMAIN EXPERT who has built product in this category and knows how ${input.city} customers actually decide. First STATE the niche bar — what best-in-class ${input.industry} sites MUST deliver and what local users expect (the must-have functional modules, the trust/credibility signals specific to this category, the information buyers compare, and the mobile/contact behaviours of this market). Then judge whether THIS page is credible and useful to a real customer, what category-essential elements are missing or wrong, and concrete fixes with severity. Be objective about conventions, not just aesthetics.`,
  },
  {
    key: 'art',
    brief: () =>
      `You are an ART DIRECTOR / brand lead. First STATE your bar (bespoke & premium vs templated/AI-generated; brand cohesion & one distinctive nameable idea; craft in the details; the "would this win the pitch and make the client proud" test). Then identify what still reads as AI/templated or generic, what lacks craft, and the specific moves that would make it feel like a real award-worthy brand. Concrete fixes with severity.`,
  },
];

export function buildPersonaReviewPrompt(
  persona: ReviewPersona,
  input: DemoGenInput,
  desktopPng: string,
  mobilePng: string,
): string {
  return [
    `Use your Read tool to VIEW BOTH full-page screenshots of an AI-generated redesign DEMO for "${input.company}" (a ${input.industry} site in ${input.city}). The reveal animations are forced on, so judge the layout/content as final:`,
    `- Desktop (1280px): ${desktopPng}`,
    `- Mobile (390px): ${mobilePng}`,
    ``,
    persona.brief(input),
    ``,
    `Be honest and demanding — this is a pitch and the deliverable IS the quality. Output your standards then a clear, concrete list of findings with severities. No HTML.`,
  ].join('\n');
}

// PASS 4 — synthesise the board into one prioritized fix list.
export function buildReviewSynthesisPrompt(input: DemoGenInput, reviews: string[]): string {
  return [
    `You are the studio's design director consolidating an expert review board's notes on the "${input.company}" (${input.industry}) demo page into ONE prioritized, de-duplicated fix list a builder can execute.`,
    ``,
    ...reviews.map((r, i) => `=== REVIEW ${i + 1} ===\n${r}`),
    ``,
    `Produce a numbered, prioritized fix list (BLOCKERS first, then major, then minor), each tagged [severity · design|content|niche|brand] and written as a concrete instruction. Drop noise and overlap. Be decisive — only what genuinely makes the page impress the client and serve a real ${input.industry} user. Output ONLY the fix list.`,
  ].join('\n');
}

// PASS 5 — revise the page to satisfy the fix list.
export function buildRevisePrompt(
  input: DemoGenInput,
  dna: DesignDNA,
  fixes: string,
  desktopPng: string,
  mobilePng: string,
  currentHtml: string,
): string {
  return [
    `You are a senior designer + front-end engineer doing a major revision of the "${input.company}" (${input.industry}, ${input.city}) demo page. Use your Read tool to view the current render: desktop ${desktopPng} and mobile ${mobilePng}.`,
    ``,
    `Apply ALL of these expert-review fixes (blockers are mandatory):`,
    fixes,
    ``,
    dnaBlock(dna),
    ``,
    `Keep the strong editorial art direction and the working content; fix everything the board flagged — design, content credibility, and niche-essential functionality. Output ONE complete, polished, responsive HTML document.`,
    ``,
    `=== CURRENT HTML (revise this) ===`,
    currentHtml,
    `=== END CURRENT HTML ===`,
    ``,
    craftConstraints(input),
  ].join('\n');
}
