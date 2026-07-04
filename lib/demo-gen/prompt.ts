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

// PASS 0.5 — DIVERGENT CONCEPTING. Before committing to a build, the director explores THREE radically
// different big ideas for THIS brand — each centered on one ownable signature move — then picks the
// boldest credible one. This is what makes a demo distinctive instead of a safe category template: the
// page is built AROUND a concept, not assembled from default sections. Media is limited to vanilla
// HTML/CSS/JS + Unsplash (no generated video/images on this plan), so signatures must live in that medium.
export function buildConceptPrompt(input: DemoGenInput, researchBrief: string, styleProvocation = ''): string {
  return [
    `You are the creative director at an Awwwards-tier studio pitching ${input.company} (${input.industry}, ${input.city}). Brainstorm THREE genuinely DIFFERENT concepts for the redesign landing page — NOT three skins of the same layout, but three distinct big ideas, each with its OWN ownable signature move and page structure. Then pick the ONE that is boldest yet still credible + unmistakably THIS brand.`,
    ``,
    clientBlock(input),
    ``,
    researchBrief.trim() ? `=== RESEARCH BRIEF (real brand + references) ===\n${researchBrief.trim()}\n=== END ===` : ``,
    ``,
    styleProvocation
      ? `AESTHETIC PROVOCATION for THIS pitch — deliberately push AWAY from the generic "dark canvas + mesh-gradient + glass cards" AI default and explore THIS visual lane (adapt it so it still fits ${input.company} + reads credible — never force an off-brand gimmick): ${styleProvocation}. Make the three concepts explore genuinely DIFFERENT visual languages, not three takes on one look.`
      : ``,
    ``,
    `Each concept = { NAME · THE BIG IDEA (one vivid sentence) · THE SIGNATURE MOVE — the ONE thing a visitor remembers: a scroll-driven narrative, an interactive build/configurator tool, a kinetic or cursor-reactive hero, a horizontal-scroll gallery, a "live" simulated module · HOW IT'S BUILT in vanilla HTML/CSS/JS + Unsplash (NO video, NO generated images) · WHY it fits ${input.industry} customers specifically }.`,
    `- The signature must spring from how a real ${input.industry} customer in ${input.city} actually browses + decides — domain-bespoke, not a generic web trick.`,
    `- BOLDNESS FLOOR: EVERY concept must break the conventional stacked vertical-landing in at least one STRUCTURAL way (an interactive-canvas hero, section-snap or horizontal scroll, a spatial/non-grid layout, a kinetic-type centerpiece, or the product itself as the interface). A clever idea on a standard hero→cards→testimonials→footer stack is NOT bold enough — push the FORMAT, not just the content.`,
    `- Differentiate HARD on BOTH idea AND visual language: if two concepts could share a layout or a look, they aren't different enough — push one further.`,
    ``,
    `Then choose the WINNER: the most ownable, memorable signature a ${input.industry} owner would be PROUD to show — bold over safe, but buildable + credible. Justify in 2 lines (why it wins; why it could only be ${input.company}).`,
    ``,
    `OUTPUT (markdown, no preamble): the 3 concepts briefly, then a line exactly "<<<WINNER>>>", then the FULL winning concept expanded for a builder — its signature move described precisely enough to implement (markup + the vanilla-JS interaction/motion mechanics), and a section-by-section blueprint built AROUND that signature, in the audit's section order, fixing the weakest dimensions.`,
  ].join('\n');
}

// PASS 1 — Creative director. Expands the CHOSEN concept into a tight, reference-anchored build spec
// (or, if no concept is supplied, invents the direction itself). Commits to ONE bold art direction and
// solves palette/type per-brand (no locked per-niche DNA — that made every demo in a category identical).
export function buildDirectorPrompt(input: DemoGenInput, researchBrief: string, concept = ''): string {
  return [
    `You are the creative director at a top studio (the bar of Linear, Stripe, Vercel, Aesop, Arc, an Awwwards Site of the Day). Write a TIGHT, opinionated design spec for a redesign landing page that wins this client. Be decisive — pick exact values, never offer options. ~250-350 words, markdown, no preamble. Output ONLY the spec.`,
    ``,
    clientBlock(input),
    ``,
    researchBrief.trim()
      ? `=== RESEARCH BRIEF (ground your design in this — REAL brand + REAL references, not invention) ===\n${researchBrief.trim()}\n=== END RESEARCH BRIEF ===\nCarry the client's REAL brand from the brief (its actual name, colours, assets, tone) and rival the named references; do NOT invent a generic company or a category-cliché palette.`
      : ``,
    ``,
    concept.trim()
      ? `=== CHOSEN CONCEPT — EXECUTE THIS (its signature move IS the page's identity; build the spec AROUND it, do NOT flatten it into a generic template) ===\n${concept.trim()}\n=== END CONCEPT ===`
      : ``,
    ``,
    concept.trim()
      ? `COMMIT TO ONE BOLD ART DIRECTION — derive it from the CHOSEN CONCEPT's OWN visual language and NAME that direction yourself; do NOT flatten the concept into one of the labels below. The archetypes are only a fallback vocabulary if the concept leaves the look underspecified. Execute the concept's aesthetic without compromise; never default to warm-cream/serif "editorial trust" (a tired AI default — only for earned prestige luxury):`
      : `COMMIT TO ONE BOLD ART DIRECTION. Pick the ONE archetype below that genuinely fits this brand and execute it without compromise — do NOT default to warm-cream/serif "editorial trust" (that look is itself a tired AI default; use it only for genuine prestige luxury and only if earned):`,
    `- Ethereal Glass — deep near-black canvas (#08090C, never pure #000), soft radial mesh-gradient orbs glowing behind, frosted glass cards (backdrop-filter blur + 1px inner white highlight + tinted inner shadow), wide geometric grotesk. Fits tech / proptech / finance / AI.`,
    `- Soft Structuralism — light silver / warm off-white, MASSIVE bold grotesk headlines, floating cards on large soft diffused ambient shadows, generous air. Fits property / health / consumer / services.`,
    `- Vivid Modern — ONE confident tasteful brand colour on a near-neutral base, bold blocks, oversized type, springy motion. Fits hospitality / food / fitness / lifestyle.`,
    `- Brutalist-Lite — raw grotesk / mono, hard edges, exposed grid, high contrast, oversized type. Fits creative / agency / bold brands.`,
    `- Refined Editorial — warm paper + subtle film-grain + a real display serif. ONLY for earned quiet luxury (prestige property, law, jewellery).`,
    ``,
    `ANCHOR THE BAR: name 2-3 real references this should rival (e.g. "the surface depth of Vercel, the type contrast of Aesop, an Awwwards property site") and what credible looks like in THIS niche ("like Nest Seekers / The Agency, not a generic listings portal"). Make it unmistakably THIS brand, not a category template.`,
    ``,
    `Then lock these as exact, paste-ready decisions:`,
    `1. THE SIGNATURE — if a CHOSEN CONCEPT is given above, realize ITS signature move as the ONE focal point and spec exactly how it's built (markup + the vanilla-JS interaction/motion mechanics); otherwise invent the bespoke hook + one signature visual move yourself (kinetic type, a real mesh/grain atmosphere, an editorial overlap, a distinctive hero composition). Either way it must be nameable from the hero alone.`,
    `2. Palette — SOLVE it per-brand; do NOT reach for the category cliché (property→brass/gold, tech→cobalt, health→teal). One near-neutral canvas + one deep anchor + exactly ONE accent, every value as hex; the accent is a less-expected but on-tone hue (justify in one line). The background is a DELIBERATE treatment — a designed surface (mesh / grain / layered tint) OR an intentional bold flat colour block — never an accidental empty flat fill.`,
    `3. Type — TWO DIFFERENT Google Fonts: a characterful DISPLAY face (e.g. Bricolage Grotesque, Unbounded, Outfit, Sora, Familjen Grotesk, Fraunces) and a separate readable BODY face (e.g. Be Vietnam Pro, Plus Jakarta Sans, Lexend, Mulish). NEVER the same family for both; NEVER Inter / Roboto / Open Sans / Space Grotesk. Demand extreme contrast — display clamp() to ~clamp(2.6rem,6vw,5.5rem), body 16-18px, a big weight jump, tight display tracking. Both MUST render flawless Vietnamese diacritics; if the natural fit fails VN, pick the best VN-correct alternative and say so.`,
    `4. Spend boldness in ONE focal point (an oversized display headline, one full-bleed image, or one saturated accent moment); keep everything else quiet and restrained.`,
    `5. Layout — grid, margins, and how section rhythm VARIES (scale, alignment, full-bleed vs contained) so no two bands feel the same. Intentional asymmetric negative space is GOOD — do NOT fill it.`,
    `6. Section-by-section blueprint in the audit's order — what's in each, its one distinctive treatment, and the niche-essential functional modules a real ${input.industry} customer expects.`,
    `7. Motion — name specific gestures (staggered entrance, a kinetic hero, a sticky header that solidifies + blurs), not "fade in".`,
    `8. Copy voice + 3 example headlines in natural Vietnamese for ${input.city}.`,
    ``,
    `SELF-CHECK before finishing: would this exact spec appear UNCHANGED for a different brand in this category? If yes, push palette/type/signature until it could only be THIS brand. Could a reviewer name your signature move from the hero screenshot alone? If not, make it bolder. Is the background a deliberate treatment (a designed surface OR an intentional bold flat colour), not an accidental empty fill?`,
  ].join('\n');
}

// The OUTPUT contract differs by pass: the build + surgical-fix passes emit HTML with no tools; the
// revise pass holds a Read tool and MUST view the screenshots first. One source so every pass agrees —
// a stray "do NOT call any tools" used to countermand the reviser's whole reason for having Read.
function outputRule(allowRead: boolean): string {
  const toolClause = allowRead
    ? `FIRST use your Read tool to VIEW every screenshot referenced above, THEN respond with the HTML DIRECTLY in your message — call no OTHER tools and write no files.`
    : `Respond with the HTML DIRECTLY in your message — do NOT call any tools and do NOT write files.`;
  return `OUTPUT: ONE complete self-contained HTML5 document (doctype → </html>), all CSS in a single <style>, all JS in one <script> before </body>. Only external resources: Google Fonts <link> and Unsplash images (https://images.unsplash.com/photo-...). Output ONLY raw HTML — no markdown fences, no commentary. ${toolClause} Do not stop early; emit the whole document in one go.`;
}

// Safety rules a surgical (measured-layout / web-app-QA) fix must ALSO honour so it never re-introduces
// the exact defects the deterministic guards catch — but which carry no "redesign" pressure. Shared
// verbatim by the creative build/revise passes and the surgical fix passes (single source of truth).
const DECORATION_SAFETY_RULE = `DECORATION SAFETY: decorative elements (dividers, rules, a "spine"/timeline line, oversized background numbers, watermarks, blobs) must sit BEHIND content (lower stacking, never over a heading or paragraph) and inside their OWN track. A vertical timeline/process spine MUST begin at the FIRST item's node and end at the LAST — it must NEVER extend up into, behind, or across a centered section heading, eyebrow, or subtitle; leave that heading clean vertical space above where the spine starts. No line, rule, or graphic may cross over text glyphs.`;

const NO_JS_SAFE_RULE = `NO-JS-SAFE REVEAL (critical): put NO opacity:0 / visibility:hidden in base CSS; add class 'js' to <html> via an inline script at the very start of <body> and gate every reveal behind \`.js\` (e.g. \`.js .reveal{opacity:0;transform:translateY(24px)}\`); NEVER hide <img>/media behind a reveal; add a failsafe \`setTimeout(()=>document.querySelectorAll('.reveal,.mask,.in-view').forEach(e=>e.classList.add('in','is-visible')),1500)\`. A per-word/line reveal MASK using overflow:hidden must NOT wrap text that carries a text-shadow or glow — overflow clips the shadow into hard rectangles behind each word; put the glow on the non-clipped parent, OR set overflow:visible once revealed (\`.js .in .word{overflow:visible}\`), OR skip the mask on glowing headlines.`;

// Shared execution rules for the build + revise passes. Lean and concrete: depth + a visible signature
// carry the same loud weight that anti-void rules used to monopolise, so the model stops shipping flat.
// `allowRead` toggles the OUTPUT tool clause for the revise pass (which reads the screenshots first).
function craftConstraints(input: DemoGenInput, opts: { allowRead?: boolean } = {}): string {
  return [
    outputRule(!!opts.allowRead),
    `SURFACE & DEPTH (match the CHOSEN style — do NOT default every site to dark-canvas + mesh-gradient + glass): the background must be a DELIBERATE, designed surface fitting the concept's aesthetic — pick what the style demands: a layered radial/mesh-gradient, OR confident flat colour-blocking, OR editorial paper + film-grain, OR a printed/patterned canvas, OR raw brutalist fields, OR crisp high-contrast Swiss white. An ACCIDENTAL empty flat fill is a FAIL, but an INTENTIONAL bold flat colour is great. Use depth cues that suit the style (tinted layered shadows + grain for soft/modern; hard edges + heavy borders for brutalist; ink-on-paper contrast for editorial) — glassmorphism ONLY where the style truly calls for it, not by default. Vary border-radius by role.`,
    `SIGNATURE MUST BE VISIBLE: the spec's ONE signature move must be unmistakable in the first viewport — a reviewer should be able to name it from the hero screenshot alone. Do not dilute it into generic polish.`,
    `STRUCTURE MANDATE (break the template — this is the #1 thing that makes demos look generic): the PRODUCT / MENU / listing section must NOT be a tidy row of equal cards. Present it an UNCONVENTIONAL way that fits the concept — a horizontal-scroll filmstrip, a single-focus interactive showcase (one large item that swaps via tabs/clicks), an editorial asymmetric list with oversized imagery, an overlapping/collage composition, or an interactive builder. The page MUST include at least ONE full-bleed or genuinely unconventional structural section (not just stacked centered bands). NEVER default to hero → row-of-3/4-equal-cards → testimonials → footer; if you catch yourself building that, redesign that section.`,
    DECORATION_SAFETY_RULE,
    `TYPE: load and actually use BOTH fonts — display face for headings only, body face for text. Extreme size/weight contrast, tight display tracking, text-wrap:balance on headings, a single H1, body line-height 1.4-1.6, WCAG-AA contrast. Never one family for everything. NAV & UI LABELS stay SMALL (~0.9-1rem) and use white-space:nowrap so nav links, buttons and badges NEVER break mid-phrase to a second line — the big clamp() display sizes are for HERO and section headings ONLY, never for nav/labels/inputs.`,
    `SPACING & LAYOUT: define a 4px-base spacing scale as CSS custom properties and use only those tokens (no ad-hoc pixels). Cap main content ~1200-1320px (full-bleed bands may bleed background/imagery but keep TEXT grid-aligned). Use flex/grid + gap; vary section rhythm. Intentional asymmetric whitespace is a FEATURE — keep it; just don't pad a thin section into an empty slab, strand a capped column alone in a wide track (size the track to its content, center it, or add a second real element), or ship a multi-item set whose cards have mismatched fields. When a SECONDARY card group (testimonials, features, pricing, stats — not the signature showcase, which follows STRUCTURE MANDATE) does use a card grid, lay it out with CSS grid or flex and a column count that fills each row cleanly for the item count — never CSS multi-column (columns/column-count), which reflows and orphans cards. The top header/nav is COMPACT and fits on ONE row at desktop — if its items won't fit, collapse to a menu/hamburger button rather than letting links wrap or overflow. A header that overlaps the hero (transparent / fixed at the top) MUST use light text with a subtle dark top-scrim so the brand + nav stay legible over the imagery, then switch to dark text once it docks to a solid light bar on scroll. No inline label, button, chip or nav item may wrap to two lines or spill past its container at any width. Real responsive layout, mobile-first, flawless at 375 / 768 / 1440px.`,
    `IMAGERY (curate, don't scatter): real Unsplash photos via <img src>, each with descriptive alt + width/height (or aspect-ratio) so nothing shifts, painting immediately. All photos share ONE consistent grade — apply a unifying brand-accent tint over each via mix-blend-mode or a brand-tinted ::after/gradient overlay so disparate stock reads as shot for one brand. Prefer few large images over many small. No emoji icons (use inline SVG); no placeholder boxes. EVERY <img> MUST carry an onerror handler that, if the photo fails to load (a dead/invalid Unsplash id), swaps in a brand-tinted gradient block of the SAME size — never let a broken-image icon ship. Prefer Unsplash ids you are confident exist; append ?w=1600&q=80 for sizing.`,
    `INTERACTIVITY: where the niche promises a tool (search, filter, "định giá"/quote, booking), implement a CONVINCING vanilla-JS mock that computes a real result from the inputs — it must actually respond. Make the CTA "${input.redesign.cta}" unmissable; on mobile add a sticky primary-action bar where the niche expects it.`,
    `MOTION (vanilla, gate behind @media (prefers-reduced-motion: reduce)): IntersectionObserver staggered scroll reveals, hover micro-interactions with cubic-bezier/spring easing, tactile :active scale(.98), a sticky header that solidifies + blurs, a button-in-button trailing icon (arrow in its own circle, never a naked icon). ${NO_JS_SAFE_RULE}`,
    `CONTENT: natural, fluent, specific Vietnamese for ${input.city} — realistic, factually-coherent names/listings/numbers, never lorem or "TODO". Keep the brand name "${input.company}".`,
    `NEVER (instant AI / dated tells): Inter/Roboto/Open Sans or one font for everything; purple→blue / purple→pink gradients; pure #000; a flat texture-less background; three equal cards in a tidy row; a generic stat bar; emoji icons; the same radius on everything; a centered-H1-over-dark-photo hero; round fake numbers and clichés ("Elevate", "Seamless", "Unleash"). Introduce no colours, fonts, or radii the spec did not name.`,
  ].join('\n');
}

// Output + safety subset ONLY — for the surgical passes (measured layout defects, web-app QA) that must
// fix a precise list and change NOTHING else. Deliberately omits the creative playbook (STRUCTURE
// MANDATE, the NEVER-list, palette/type/interactivity directives) whose "redesign that section" pressure
// would license exactly the broad changes those passes are instructed not to make.
function surgicalConstraints(): string {
  return [outputRule(false), DECORATION_SAFETY_RULE, NO_JS_SAFE_RULE].join('\n');
}

// PASS 2 — Build the page from the spec.
export function buildBuildPrompt(input: DemoGenInput, spec: string): string {
  return [
    `You are a world-class front-end engineer building exactly what your creative director specced. Follow the spec's direction, palette, the TWO distinct fonts, the focal point, and the ONE signature move — faithfully and boldly. Build the spec's bold STRUCTURE; do NOT quietly fall back to the generic hero → row-of-equal-cards → testimonials → footer template (that is the failure mode to avoid). The signature move + the concept's unconventional layout are the point — realise them, don't sand them toward a safe, conventional category landing.`,
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
      `You are a SENIOR UI/UX DESIGNER (ex-top-agency, Awwwards juror). STATE your standards (visual hierarchy & focal flow, type scale & rhythm, spacing consistency, colour/contrast & WCAG, component states, mobile usability & tap targets, conversion clarity). Then list concrete defects: element + viewport, the issue, severity (blocker/major/minor), a specific fix. IMPORTANT — intentional asymmetric negative space and generous whitespace are a FEATURE, not a defect: do NOT flag them. Only flag layout that is genuinely BROKEN: misaligned items, overlapping/clipped content, an element stranded by a transform, a capped column alone in a wide track, hard rectangular shadow/halo boxes behind headline words (a glow clipped by an overflow:hidden reveal mask), or a multi-item set whose cards have mismatched fields. Be exacting about weak hierarchy, flat type contrast, inconsistent spacing, clumsy mobile, and especially TEXT THAT WRAPS OR OVERFLOWS (nav links breaking to two lines, oversized nav/label fonts, clipped buttons, a cramped header) — call these out with the element + a concrete fix. CHECK READABILITY FIRST: flag ANY text that is hard to read against what sits behind it — a transparent / overlay header or nav whose brand + links blend into the hero photo, a hero headline or body text over a busy or similar-toned image / gradient, or any low-contrast text — this is a defect even when nothing is misaligned; name the element + a concrete fix (light text + a subtle dark scrim over imagery, or a solid backing). ALSO flag any decorative line, rule, spine, or oversized background number that crosses OVER or sits BEHIND heading or body text (e.g. a timeline spine running up through a centered section title, or a graphic overlapping glyphs) — that is a layout BLOCKER, not intentional styling.`,
  },
  {
    key: 'copy',
    brief: (input) =>
      `You are a CONVERSION COPYWRITER & CONTENT STRATEGIST, native to the ${input.city} market. STATE your standards (value-prop clarity, headline hook, message hierarchy & scannability, specificity vs vague fluff, CTA quality, trust/proof language, natural fluent Vietnamese tone for this niche). Then critique the ACTUAL copy — headlines, subheads, section intros, card/testimonial text, CTAs. Flag anything generic, AI-written, translated-sounding, exaggerated, factually incoherent, or unconvincing to a real local ${input.industry} customer. Give concrete Vietnamese rewrites as fixes, with severity.`,
  },
  {
    key: 'niche',
    brief: (input) =>
      `You are a ${input.industry.toUpperCase()} DOMAIN EXPERT who has built product in this category and knows how ${input.city} customers actually decide. STATE the niche bar — the must-have FUNCTIONAL modules, the trust/credibility signals, the information buyers compare, the mobile/contact behaviours of this market. Then judge whether THIS page is credible + useful to a real customer and what category-essential FUNCTIONAL elements are missing or wrong (concrete fixes + severity). CRITICAL — judge FUNCTION + TRUST + INFO ONLY: do NOT penalise a bold or unconventional VISUAL style for "not looking like a typical ${input.industry} site". A distinctive, surprising look that still surfaces the right information + actions is a WIN; this category does NOT need to look generic. NEVER recommend making the styling more conventional or more like competitors.`,
  },
  {
    key: 'art',
    brief: (input) =>
      `You are an ART DIRECTOR / brand lead. STATE your bar (bespoke & premium vs templated/AI-generated; one distinctive nameable idea; craft in the details; the "would this win the pitch" test). Then identify what reads as AI/templated/generic and the specific moves to make it award-worthy. THE #1 BLOCKER is REGRESSION TO A GENERIC CATEGORY TEMPLATE: a stacked hero → row-of-equal-cards → testimonials → footer layout, a plain 3/4-equal-card grid, a stock "could be any ${input.industry} brand" landing, no nameable signature move in the hero. Also blockers: a single font for everything, a cliché/default palette, an accidental flat texture-less fill. EVERY fix you give must push the page BOLDER + MORE distinctive / more unconventional — NEVER toward safer, calmer, or more conventional. If this page would look interchangeable with a different brand in the category, that is THE blocker — name it and give a concrete bold fix.`,
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
    `Be honest and demanding — this is a pitch and the deliverable IS the quality.`,
    ``,
    `CONFIDENCE GATE: raise only what a senior reviewer would be over 80% sure is a real problem. If you are not certain an issue is real, leave it out — a noisy review drags the page toward sanded-down nitpicks. Mark anything you cannot verify on the slices as UNREVIEWED rather than guessing.`,
    ``,
    `State your standards, then write each finding in this exact form (the WHY makes the revise pass fix the right thing, not just the symptom):`,
    `- Expected: <the standard from your bar that applies> · Gap: <element + which viewport/slice + what is wrong> · Fix: <one concrete change> · Severity: blocker | major | minor`,
    `Severity scale (use blocker sparingly so the synthesis can rank across lenses): blocker = a real customer bounces or the pitch is lost; major = noticeably cheapens it; minor = polish.`,
    ``,
    `End with ONE line — "VERDICT: PASS" or "VERDICT: HOLD" + the single highest-leverage change. If PASS, still name the one move that would make it stronger; empty praise ("looks good") is not an acceptable review. No HTML.`,
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
    `Produce a SHORT numbered list — AT MOST 6 fixes — ordered by impact on how DISTINCTIVE + premium the page feels. LEAD with the biggest DISTINCTIVENESS blocker: if the page has regressed to a generic category template (a plain row of equal cards, a stock "could be any brand" landing, no nameable signature), the #1 fix is to push it back to a BOLD, unconventional, ownable design — then single-font/cliché-palette/broken-layout blockers, then high-leverage craft/content fixes. Each fix is ONE concrete instruction tagged [severity · design|content|niche|brand]. CRITICAL: never soften the page's IDENTITY — its signature move, palette, type pairing, or bold structure — to satisfy a nitpick or to look more conventional/competitor-like. BUT legibility, contrast, and broken-layout fixes are MANDATORY even when the remedy is quieter (a dark scrim under an overlay header, a solid backing behind text on a busy image, smaller nav labels): making an unreadable or broken element correct is NOT "making the page safer" and must never be dropped for boldness. Don't pad with nitpicks; don't flag intentional whitespace. Output ONLY the fix list.`,
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
    `Apply these expert-review fixes BOLDLY (blockers are mandatory) — do not sand the design toward a safe template. If the current render reads like a GENERIC category template (a plain row of equal cards, a stock "could be any brand" landing, no nameable signature), treat THAT as the top regression to fix: push it toward a BOLDER, more unconventional, ownable design — make it MORE distinctive, NEVER safer or more conventional:`,
    fixes,
    ``,
    `Output ONE complete, polished, responsive HTML document.`,
    ``,
    `REGRESSION GUARD: the design's signature move, the TWO distinct fonts (display ≠ body), and the deliberate background treatment (a designed surface OR an intentional bold flat colour — not an accidental empty fill) MUST remain present and prominent after your edits — never flatten the page chasing fixes. Keep all working content and imagery.`,
    `VERIFICATION: before you output, silently confirm each numbered fix is present in your HTML and the design is still bold; do not output until every blocker is satisfied.`,
    ``,
    `=== CURRENT HTML (revise this) ===`,
    currentHtml,
    `=== END CURRENT HTML ===`,
    ``,
    craftConstraints(input, { allowRead: true }),
  ].join('\n');
}

// Deterministic-guard pass — fix ONLY the mechanically-detected layout defects, change nothing else. The
// fix list comes from auditLayout() (real headless DOM measurements), so it is precise + surgical.
export function buildLayoutFixPrompt(input: DemoGenInput, fixList: string, currentHtml: string): string {
  return [
    `You are a senior front-end engineer doing a SURGICAL layout-bug fix on the "${input.company}" (${input.industry}) demo page. A headless browser measured the rendered page and found these CONCRETE layout defects:`,
    fixList,
    ``,
    `Fix EXACTLY these defects and NOTHING else. Do NOT redesign, restyle, recolour, rewrite copy, or change the concept — the page must look identical except that each listed defect is gone. Safe fixes: start a decorative spine/line BELOW the heading (or move it behind text with a lower z-index) so it never crosses a title; constrain or wrap an overflowing element / add a max-width so nothing exceeds the viewport; keep a wrapped nav label on one line (nowrap / smaller size / hamburger); fix a broken image source or its sizing.`,
    `Respond with the COMPLETE corrected HTML document DIRECTLY in your message — do NOT call any tools, do NOT write files, do NOT stop early. Keep ALL existing content, imagery, scripts, and styles intact.`,
    ``,
    `=== CURRENT HTML (fix this) ===`,
    currentHtml,
    `=== END CURRENT HTML ===`,
    ``,
    // Only the output + safety rules — NOT the full creative playbook, whose "redesign that section" /
    // NEVER-list directives would license the broad restyling this surgical pass is told not to do.
    surgicalConstraints(),
  ].join('\n');
}

// Deterministic-guard pass — repair ONLY the mechanically-detected RUNTIME-HEALTH defects (JS/console
// errors, broken asset URLs, missing alt / lang / <h1> / accessible control names). Unlike the layout
// fixer these fixes REQUIRE touching scripts, attributes, and asset URLs — so this prompt permits those
// edits explicitly while still forbidding any visual redesign.
export function buildQaFixPrompt(input: DemoGenInput, findings: string, currentHtml: string): string {
  return [
    `You are a senior front-end engineer doing a SURGICAL runtime-health fix on the "${input.company}" (${input.industry}) demo page. A headless browser loaded the page and found these CONCRETE runtime/accessibility defects:`,
    findings,
    ``,
    `Fix EXACTLY these defects and NOTHING else — the page must look VISUALLY IDENTICAL; do NOT redesign, restyle, recolour, rewrite marketing copy, or change the layout or concept. Unlike a pure layout fix, correcting these REQUIRES editing code, so these targeted changes are EXPECTED and permitted: edit or repair the <script> to clear a console/JS error; swap a broken/invalid asset URL for a working one (or the brand-tinted gradient fallback); add a missing lang attribute on <html>, a single <h1>, descriptive alt text on images, and accessible names (aria-label / visible text) on unnamed controls. Change nothing beyond what a listed defect requires.`,
    `Respond with the COMPLETE corrected HTML document DIRECTLY in your message — do NOT call any tools, do NOT write files, do NOT stop early. Keep ALL existing visual content, imagery, and styles intact.`,
    ``,
    `=== CURRENT HTML (fix this) ===`,
    currentHtml,
    `=== END CURRENT HTML ===`,
    ``,
    surgicalConstraints(),
  ].join('\n');
}
