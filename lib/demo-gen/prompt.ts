// Prompt builders for the multi-pass demo-generation engine. Pure (no runtime deps) so they are safe
// in the worker tsx chain. Pipeline: (1) creative-director spec → (2) build → (3) a niche-aware EXPERT
// REVIEW BOARD critiques the rendered screenshots → (4) synthesise fixes → (5) revise. The prompts are
// deliberately TIGHT and reference-anchored: a few bold, concrete demands (commit to one art direction,
// real depth, a visible signature, two distinct fonts) rather than a long defensive checklist — a pile
// of "don't" rules makes the model tick boxes and ship something flat and safe.
import type { AuditResult } from '../data/types';

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

// PASS 0 — research (best-effort). Ground the redesign in the client's REAL brand (from their current
// site) and benchmark best-in-class niche references, so the director designs from reality not invention.
export function buildResearchPrompt(input: DemoGenInput, oldSitePngs: string[]): string {
  const shots = oldSitePngs.length
    ? oldSitePngs.map((pth, i) => `- current-site shot ${i + 1}: ${pth}`).join('\n')
    : '- (current-site screenshot unavailable — work from the audit summary)';
  return [
    `You are a brand + web-design researcher at a top studio prepping a redesign pitch for "${input.company}" (${input.industry}, ${input.city}). Produce a TIGHT research brief (markdown, ~200 words) the creative director designs from. Output ONLY the brief.`,
    ``,
    `Audit context: ${input.summary}`,
    ``,
    `PART 1 — CLIENT REALITY (ground the redesign; do NOT invent a new company): use your Read tool to VIEW the client's CURRENT site:`,
    shots,
    `Extract the REAL brand to carry forward — brand/wordmark + its actual colours (hex), the real product/listings + photo style, the genuine value proposition + tone — and the 2-3 worst things to KILL in the redesign.`,
    ``,
    `PART 2 — REFERENCE BAR (benchmark the niche): from your knowledge of best-in-class ${input.industry} websites (global + the ${input.city} / Vietnam market), name 2-3 worth rivalling and extract concrete, CURRENT design cues to steal: layout system, type-pairing energy, colour mood, signature interactions, what makes a 2026 ${input.industry} site feel premium.`,
    ``,
    `Output exactly two blocks — "CLIENT REALITY" (brand name, colours, real assets, tone, kill-list) and "REFERENCE BAR" (named sites + concrete design cues). Specific and factual; no preamble.`,
  ].join('\n');
}

// PASS 1 — Creative director. A tight, opinionated, reference-anchored spec that commits to ONE bold
// art direction and solves the palette/type per-brand (no locked per-niche DNA — that made every demo
// in a category identical and contradicted the modern direction).
export function buildDirectorPrompt(input: DemoGenInput, researchBrief: string): string {
  return [
    `You are the creative director at a top studio (the bar of Linear, Stripe, Vercel, Aesop, Arc, an Awwwards Site of the Day). Write a TIGHT, opinionated design spec for a redesign landing page that wins this client. Be decisive — pick exact values, never offer options. ~250-350 words, markdown, no preamble. Output ONLY the spec.`,
    ``,
    clientBlock(input),
    ``,
    researchBrief.trim()
      ? `=== RESEARCH BRIEF (ground your design in this — REAL brand + REAL references, not invention) ===\n${researchBrief.trim()}\n=== END RESEARCH BRIEF ===\nCarry the client's REAL brand from the brief (its actual name, colours, assets, tone) and rival the named references; do NOT invent a generic company or a category-cliché palette.`
      : ``,
    ``,
    `COMMIT TO ONE BOLD ART DIRECTION. Pick the ONE archetype that genuinely fits this brand and execute it without compromise — do NOT default to warm-cream/serif "editorial trust" (that look is itself a tired AI default; use it only for genuine prestige luxury and only if earned):`,
    `- Ethereal Glass — deep near-black canvas (#08090C, never pure #000), soft radial mesh-gradient orbs glowing behind, frosted glass cards (backdrop-filter blur + 1px inner white highlight + tinted inner shadow), wide geometric grotesk. Fits tech / proptech / finance / AI.`,
    `- Soft Structuralism — light silver / warm off-white, MASSIVE bold grotesk headlines, floating cards on large soft diffused ambient shadows, generous air. Fits property / health / consumer / services.`,
    `- Vivid Modern — ONE confident tasteful brand colour on a near-neutral base, bold blocks, oversized type, springy motion. Fits hospitality / food / fitness / lifestyle.`,
    `- Brutalist-Lite — raw grotesk / mono, hard edges, exposed grid, high contrast, oversized type. Fits creative / agency / bold brands.`,
    `- Refined Editorial — warm paper + subtle film-grain + a real display serif. ONLY for earned quiet luxury (prestige property, law, jewellery).`,
    ``,
    `ANCHOR THE BAR: name 2-3 real references this should rival (e.g. "the surface depth of Vercel, the type contrast of Aesop, an Awwwards property site") and what credible looks like in THIS niche ("like Nest Seekers / The Agency, not a generic listings portal"). Make it unmistakably THIS brand, not a category template.`,
    ``,
    `Then lock these as exact, paste-ready decisions:`,
    `1. ONE memorable idea — the bespoke hook a human designer would pitch for THIS brand (one sentence) + the ONE signature visual move that carries the page (a kinetic type treatment, a real mesh/grain atmosphere, an editorial overlap, a distinctive hero composition).`,
    `2. Palette — SOLVE it per-brand; do NOT reach for the category cliché (property→brass/gold, tech→cobalt, health→teal). One near-neutral canvas + one deep anchor + exactly ONE accent, every value as hex; the accent is a less-expected but on-tone hue (justify in one line). The background is a DESIGNED surface (mesh / grain / layered tint), never a flat fill.`,
    `3. Type — TWO DIFFERENT Google Fonts: a characterful DISPLAY face (e.g. Bricolage Grotesque, Unbounded, Outfit, Sora, Familjen Grotesk, Fraunces) and a separate readable BODY face (e.g. Be Vietnam Pro, Plus Jakarta Sans, Lexend, Mulish). NEVER the same family for both; NEVER Inter / Roboto / Open Sans / Space Grotesk. Demand extreme contrast — display clamp() to ~clamp(2.6rem,6vw,5.5rem), body 16-18px, a big weight jump, tight display tracking. Both MUST render flawless Vietnamese diacritics; if the natural fit fails VN, pick the best VN-correct alternative and say so.`,
    `4. Spend boldness in ONE focal point (an oversized display headline, one full-bleed image, or one saturated accent moment); keep everything else quiet and restrained.`,
    `5. Layout — grid, margins, and how section rhythm VARIES (scale, alignment, full-bleed vs contained) so no two bands feel the same. Intentional asymmetric negative space is GOOD — do NOT fill it.`,
    `6. Section-by-section blueprint in the audit's order — what's in each, its one distinctive treatment, and the niche-essential functional modules a real ${input.industry} customer expects.`,
    `7. Motion — name specific gestures (staggered entrance, a kinetic hero, a sticky header that solidifies + blurs), not "fade in".`,
    `8. Copy voice + 3 example headlines in natural Vietnamese for ${input.city}.`,
    ``,
    `SELF-CHECK before finishing: would this exact spec appear UNCHANGED for a different brand in this category? If yes, push palette/type/signature until it could only be THIS brand. Could a reviewer name your signature move from the hero screenshot alone? If not, make it bolder. Is the background a designed surface, not a flat fill?`,
  ].join('\n');
}

// Shared execution rules for the build + revise passes. Lean and concrete: depth + a visible signature
// carry the same loud weight that anti-void rules used to monopolise, so the model stops shipping flat.
function craftConstraints(input: DemoGenInput): string {
  return [
    `OUTPUT: ONE complete self-contained HTML5 document (doctype → </html>), all CSS in a single <style>, all JS in one <script> before </body>. Only external resources: Google Fonts <link> and Unsplash images (https://images.unsplash.com/photo-...). Output ONLY raw HTML — no markdown fences, no commentary. Do not stop early.`,
    `DEPTH IS MANDATORY (this is what makes it 2026, not 2021): the background MUST be a designed surface — a layered radial / mesh-gradient and/or a fixed low-opacity SVG feTurbulence grain overlay (pointer-events:none). A flat solid background is an automatic FAIL. Use tinted shadows that carry the background hue (never pure black), layered not single drop-shadows, and where the archetype calls for it true glassmorphism (backdrop-filter blur + 1px inset highlight). Vary border-radius by role.`,
    `SIGNATURE MUST BE VISIBLE: the spec's ONE signature move must be unmistakable in the first viewport — a reviewer should be able to name it from the hero screenshot alone. Do not dilute it into generic polish.`,
    `TYPE: load and actually use BOTH fonts — display face for headings only, body face for text. Extreme size/weight contrast, tight display tracking, text-wrap:balance on headings, a single H1, body line-height 1.4-1.6, WCAG-AA contrast. Never one family for everything. NAV & UI LABELS stay SMALL (~0.9-1rem) and use white-space:nowrap so nav links, buttons and badges NEVER break mid-phrase to a second line — the big clamp() display sizes are for HERO and section headings ONLY, never for nav/labels/inputs.`,
    `SPACING & LAYOUT: define a 4px-base spacing scale as CSS custom properties and use only those tokens (no ad-hoc pixels). Cap main content ~1200-1320px (full-bleed bands may bleed background/imagery but keep TEXT grid-aligned). Use flex/grid + gap; vary section rhythm. Intentional asymmetric whitespace is a FEATURE — keep it; just don't pad a thin section into an empty slab, strand a capped column alone in a wide track (size the track to its content, center it, or add a second real element), or ship a multi-item set whose cards have mismatched fields. The top header/nav is COMPACT and fits on ONE row at desktop — if its items won't fit, collapse to a menu/hamburger button rather than letting links wrap or overflow. No inline label, button, chip or nav item may wrap to two lines or spill past its container at any width. Real responsive layout, mobile-first, flawless at 375 / 768 / 1440px.`,
    `IMAGERY (curate, don't scatter): real Unsplash photos via <img src>, each with descriptive alt + width/height (or aspect-ratio) so nothing shifts, painting immediately. All photos share ONE consistent grade — apply a unifying brand-accent tint over each via mix-blend-mode or a brand-tinted ::after/gradient overlay so disparate stock reads as shot for one brand. Prefer few large images over many small. No emoji icons (use inline SVG); no placeholder boxes.`,
    `INTERACTIVITY: where the niche promises a tool (search, filter, "định giá"/quote, booking), implement a CONVINCING vanilla-JS mock that computes a real result from the inputs — it must actually respond. Make the CTA "${input.redesign.cta}" unmissable; on mobile add a sticky primary-action bar where the niche expects it.`,
    `MOTION (vanilla, gate behind @media (prefers-reduced-motion: reduce)): IntersectionObserver staggered scroll reveals, hover micro-interactions with cubic-bezier/spring easing, tactile :active scale(.98), a sticky header that solidifies + blurs, a button-in-button trailing icon (arrow in its own circle, never a naked icon). NO-JS-SAFE REVEAL (critical): put NO opacity:0 / visibility:hidden in base CSS; add class 'js' to <html> via an inline script at the very start of <body> and gate every reveal behind \`.js\` (e.g. \`.js .reveal{opacity:0;transform:translateY(24px)}\`); NEVER hide <img>/media behind a reveal; add a failsafe \`setTimeout(()=>document.querySelectorAll('.reveal,.mask,.in-view').forEach(e=>e.classList.add('in','is-visible')),1500)\`. A per-word/line reveal MASK using overflow:hidden must NOT wrap text that carries a text-shadow or glow — overflow clips the shadow into hard rectangles behind each word; put the glow on the non-clipped parent, OR set overflow:visible once revealed (\`.js .in .word{overflow:visible}\`), OR skip the mask on glowing headlines.`,
    `CONTENT: natural, fluent, specific Vietnamese for ${input.city} — realistic, factually-coherent names/listings/numbers, never lorem or "TODO". Keep the brand name "${input.company}".`,
    `NEVER (instant AI / dated tells): Inter/Roboto/Open Sans or one font for everything; purple→blue / purple→pink gradients; pure #000; a flat texture-less background; three equal cards in a tidy row; a generic stat bar; emoji icons; the same radius on everything; a centered-H1-over-dark-photo hero; round fake numbers and clichés ("Elevate", "Seamless", "Unleash"). Introduce no colours, fonts, or radii the spec did not name.`,
  ].join('\n');
}

// PASS 2 — Build the page from the spec.
export function buildBuildPrompt(input: DemoGenInput, spec: string): string {
  return [
    `You are a world-class front-end engineer building exactly what your creative director specced. Follow the spec's direction, palette, the TWO distinct fonts, the focal point, and the ONE signature move — faithfully and boldly. Do not sand it toward a safe template.`,
    ``,
    `=== DESIGN SPEC ===`,
    spec,
    `=== END SPEC ===`,
    ``,
    clientBlock(input),
    ``,
    craftConstraints(input),
  ].join('\n');
}

// PASS 3 — the expert review board. Each persona judges the rendered screenshots against its
// discipline's bar. Re-aimed so intentional whitespace is a PASS and "flat / dated / single-font /
// template palette" is a blocker equal to a real layout bug.
export interface ReviewPersona {
  key: string;
  brief: (input: DemoGenInput) => string;
}

export const REVIEW_PERSONAS: ReviewPersona[] = [
  {
    key: 'uiux',
    brief: () =>
      `You are a SENIOR UI/UX DESIGNER (ex-top-agency, Awwwards juror). STATE your standards (visual hierarchy & focal flow, type scale & rhythm, spacing consistency, colour/contrast & WCAG, component states, mobile usability & tap targets, conversion clarity). Then list concrete defects: element + viewport, the issue, severity (blocker/major/minor), a specific fix. IMPORTANT — intentional asymmetric negative space and generous whitespace are a FEATURE, not a defect: do NOT flag them. Only flag layout that is genuinely BROKEN: misaligned items, overlapping/clipped content, an element stranded by a transform, a capped column alone in a wide track, hard rectangular shadow/halo boxes behind headline words (a glow clipped by an overflow:hidden reveal mask), or a multi-item set whose cards have mismatched fields. Be exacting about weak hierarchy, flat type contrast, inconsistent spacing, clumsy mobile, and especially TEXT THAT WRAPS OR OVERFLOWS (nav links breaking to two lines, oversized nav/label fonts, clipped buttons, a cramped header) — call these out with the element + a concrete fix.`,
  },
  {
    key: 'copy',
    brief: (input) =>
      `You are a CONVERSION COPYWRITER & CONTENT STRATEGIST, native to the ${input.city} market. STATE your standards (value-prop clarity, headline hook, message hierarchy & scannability, specificity vs vague fluff, CTA quality, trust/proof language, natural fluent Vietnamese tone for this niche). Then critique the ACTUAL copy — headlines, subheads, section intros, card/testimonial text, CTAs. Flag anything generic, AI-written, translated-sounding, exaggerated, factually incoherent, or unconvincing to a real local ${input.industry} customer. Give concrete Vietnamese rewrites as fixes, with severity.`,
  },
  {
    key: 'niche',
    brief: (input) =>
      `You are a ${input.industry.toUpperCase()} DOMAIN EXPERT who has built product in this category and knows how ${input.city} customers actually decide. STATE the niche bar — the must-have functional modules, the trust/credibility signals specific to this category, the information buyers compare, the mobile/contact behaviours of this market. Then judge whether THIS page is credible and useful to a real customer, what category-essential elements are missing or wrong, and concrete fixes with severity. Also judge whether the typography + styling fit how a real ${input.industry} customer expects a credible brand to look (an off-niche typeface or styling that fights the category's conventions is a real defect).`,
  },
  {
    key: 'art',
    brief: () =>
      `You are an ART DIRECTOR / brand lead. STATE your bar (bespoke & premium vs templated/AI-generated; one distinctive nameable idea; craft in the details; the "would this win the pitch" test). Then identify what reads as AI/templated/generic and the specific moves to make it award-worthy. Judge MODERNITY & DISTINCTIVENESS STRICTLY — treat these as BLOCKERS equal to any layout bug: a FLAT texture-less background (no mesh/grain/depth), a SINGLE font used for everything (no display↔body contrast), a category-cliché or default palette (property→brass, tech→blue-purple), or NO nameable signature move visible in the hero. If this page would look identical for a different brand in the same category, that is a blocker — say so with a concrete fix.`,
  },
];

// A tall page is delivered as ordered top→bottom slices so each image stays at a legible resolution.
function sliceList(label: string, width: number, paths: string[]): string {
  if (paths.length <= 1) return `- ${label} (${width}px): ${paths[0] ?? '(none)'}`;
  return paths.map((p, i) => `- ${label} (${width}px) slice ${i + 1}/${paths.length} (top→bottom): ${p}`).join('\n');
}

export function buildPersonaReviewPrompt(
  persona: ReviewPersona,
  input: DemoGenInput,
  desktopPngs: string[],
  mobilePngs: string[],
  desktopWidth: number,
  mobileWidth: number,
): string {
  return [
    `Use your Read tool to VIEW EVERY screenshot below of an AI-generated redesign DEMO for "${input.company}" (a ${input.industry} site in ${input.city}). The page is tall, so each viewport is delivered as ordered top→bottom slices — READ THEM ALL; the page continues into the next slice. The reveal animations are forced on, so judge the layout/content as final:`,
    sliceList('Desktop', desktopWidth, desktopPngs),
    sliceList('Mobile', mobileWidth, mobilePngs),
    ``,
    `COVERAGE: do NOT assume a section you cannot see is absent or fine. Expected sections: ${input.redesign.sections.join(', ')}. If any is missing from the slices, FLAG it as UNREVIEWED. You CANNOT see hover/focus/active or post-interaction states — do not credit them.`,
    ``,
    persona.brief(input),
    ``,
    `Be honest and demanding — this is a pitch and the deliverable IS the quality. Output your standards then a clear, concrete list of findings with severities. No HTML.`,
  ].join('\n');
}

// PASS 4 — synthesise the board into ONE short, bold fix list. Capped so revise commits to high-impact
// moves instead of spreading its budget across safe nitpicks.
export function buildReviewSynthesisPrompt(input: DemoGenInput, reviews: string[]): string {
  return [
    `You are the studio's design director consolidating an expert review board's notes on the "${input.company}" (${input.industry}) demo into ONE prioritized fix list a builder can execute.`,
    ``,
    ...reviews.map((r, i) => `=== REVIEW ${i + 1} ===\n${r}`),
    ``,
    `Produce a SHORT numbered list — AT MOST 6 fixes — ordered by impact on how premium and modern the page feels. LEAD with any MODERNITY/DISTINCTIVENESS blocker (flat background, single font, cliché palette, no visible signature) or genuinely BROKEN-layout blocker; then the highest-leverage craft / content / niche fixes. Each fix is ONE concrete instruction tagged [severity · design|content|niche|brand]. Do NOT pad with minor nitpicks and do NOT flag intentional whitespace — a tight list of bold fixes beats a long list of safe ones. Output ONLY the fix list.`,
  ].join('\n');
}

// PASS 5 — revise the page to satisfy the fix list, WITHOUT flattening the design.
export function buildRevisePrompt(
  input: DemoGenInput,
  fixes: string,
  desktopPngs: string[],
  mobilePngs: string[],
  currentHtml: string,
): string {
  const render = (label: string, paths: string[]) =>
    paths.length <= 1 ? `${label} ${paths[0] ?? '(none)'}` : `${label} slices top→bottom: ${paths.join(' , ')}`;
  return [
    `You are a senior designer + front-end engineer revising the "${input.company}" (${input.industry}, ${input.city}) demo page. Use your Read tool to view the current render (tall pages come as ordered top→bottom slices — read them all): ${render('desktop', desktopPngs)}; ${render('mobile', mobilePngs)}.`,
    ``,
    `Apply these expert-review fixes BOLDLY (blockers are mandatory) — do not sand the design toward a safe template:`,
    fixes,
    ``,
    `Output ONE complete, polished, responsive HTML document.`,
    ``,
    `REGRESSION GUARD: the design's signature move, the TWO distinct fonts (display ≠ body), and the designed non-flat background MUST remain present and prominent after your edits — never flatten the page chasing fixes. Keep all working content and imagery.`,
    `VERIFICATION: before you output, silently confirm each numbered fix is present in your HTML and the design is still bold; do not output until every blocker is satisfied.`,
    ``,
    `=== CURRENT HTML (revise this) ===`,
    currentHtml,
    `=== END CURRENT HTML ===`,
    ``,
    craftConstraints(input),
  ].join('\n');
}
