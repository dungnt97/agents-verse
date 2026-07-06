// The demo-generation pipeline, re-expressed over the shared agent runtime. Behaviour is identical to
// the previous single-file engine: Atlas specs → Nova builds → the niche-aware review board critiques
// the rendered screenshots in parallel → Atlas synthesises a prioritized fix list → Nova revises.
// Passes 3-5 are best-effort and fall back to the solid built page, so the result is never worse than a
// single build. WORKER-ONLY (shells `claude`): relative imports, no `server-only`. Never import from web.
import { atlasConceptor, atlasDirector, atlasSynthesizer } from '../defs/atlas-strategist';
import { novaBuilder, novaReviser, novaLayoutFixer, novaQaFixer } from '../defs/nova-designer';
import { REVIEW_BOARD } from '../board';
import { runAgent, runBoard } from '../runner';
import { renderHtmlToPng, DESKTOP_WIDTH, MOBILE_WIDTH } from '../../demo-gen/render';
import { auditLayout } from '../../demo-gen/layout-audit';
import { formatLayoutFixList } from '../../demo-gen/layout-defects';
import { runWebappQa } from '../../demo-gen/webapp-qa';
import { formatQaReport, hasBlockingQa, majorQaCount } from '../../demo-gen/qa-findings';
import { captureScreenshots, closeBrowser } from '../../audit/screenshot';
import { vegaResearcher } from '../defs/vega-researcher';
import { writeFile } from 'node:fs/promises';
import type { DemoGenInput } from '../../demo-gen/prompt';

// Minimal structural view of an Inngest `step` — enough to checkpoint each pass without coupling this
// worker-chain module to the inngest package. run-demo-gen passes a thin adapter over the real step;
// callers outside Inngest (or tests) get the inline default that just runs the work.
export interface StepRunner {
  run(id: string, handler: () => Promise<string>): Promise<string>;
}
const inlineRunner: StepRunner = { run: (_id, fn) => fn() };

// The conceptor outputs the 3 explored concepts, then a `<<<WINNER>>>` marker, then the full winning
// brief. Hand the director the winner only; fall back to the whole output if the marker is absent.
function extractWinner(concepts: string): string {
  const marker = '<<<WINNER>>>';
  const i = concepts.indexOf(marker);
  return i === -1 ? concepts.trim() : concepts.slice(i + marker.length).trim();
}

// Each board lens ends its critique with "VERDICT: PASS" or "VERDICT: HOLD". When EVERY surviving lens
// passes and none flags a blocker-severity defect, the page is clean — the synth+revise round would then
// only rewrite a page all four lenses already approved, spending a full pass and risking a regression for
// no measured gain. This is the real all-clear signal the loop's early-stop was always meant to use
// (the previous `reviews.length === 0` guard only fired when EVERY lens crashed).
export function boardPassesClean(reviews: string[]): boolean {
  if (reviews.length === 0) return false;
  const allPass = reviews.every((r) => /verdict:\s*pass/i.test(r));
  const anyBlocker = reviews.some((r) => /severity\s*[:=]?\s*blocker/i.test(r));
  return allPass && !anyBlocker;
}

// Per-run aesthetic lanes. One is picked at random each generation and fed to the concepting pass so
// consecutive demos diverge in VISUAL LANGUAGE instead of all converging on the dark-glass AI default.
// They're provocations the director adapts to the brand — not rigid templates.
const STYLE_LANES: readonly string[] = [
  'Maximalist editorial — oversized type, dense layered collage, magazine energy, bold colour, lots of personality (anti-minimal).',
  'Neo-brutalist — raw exposed grid, hard borders, mono/grotesk, high contrast, intentional "unpolished" confidence.',
  'Kinetic typography — TYPE is the hero: words scale/move/animate, imagery minimal, the message itself is the spectacle.',
  'Warm organic / handcrafted — natural textures, irregular hand-made shapes, soft warmth, human imperfection over slick.',
  'Swiss high-contrast minimal — strict grid, huge whitespace, ONE bold accent, ruthless restraint, confident emptiness.',
  'Retro-future / Y2K reimagined — chrome, playful nostalgia, expressive gradients, fun energy tuned for 2026.',
  'Spatial scroll-narrative — the page is a journey: section-snap or horizontal scroll, scene-based storytelling.',
  'Tactile product-forward — giant full-bleed product imagery; the product IS the interface; gallery as centerpiece.',
  'Dark immersive / neon — deep cinematic canvas, glowing spotlights on the product (only if the brand truly fits).',
];

// Each pass is its own checkpointed step so an Inngest retry / worker restart / reconnect RESUMES from
// the last completed pass instead of re-spending the whole ~20-32 min run. The expensive ~6-min build
// is its own step, so it is never redone once it has succeeded. The render→board→synth→revise block is
// ONE step on purpose: its /tmp PNGs are created and consumed within that step, so there is no
// cross-step file dependency (which a resume on a fresh worker — empty /tmp — would otherwise break).
export async function generateDemoHtml(input: DemoGenInput, step: StepRunner = inlineRunner): Promise<string> {
  // The `claude` CLI reaches a model two ways: directly on the subscription (CLAUDE_CODE_OAUTH_TOKEN)
  // or through a gateway it points at via ANTHROPIC_BASE_URL (+ ANTHROPIC_AUTH_TOKEN) — e.g. the
  // self-hosted 9router service, which persists + auto-refreshes the provider auth. Require one of them.
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN && !process.env.ANTHROPIC_BASE_URL) {
    throw new Error(
      'No Claude backend configured — set CLAUDE_CODE_OAUTH_TOKEN (direct subscription) or ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN (9router gateway).',
    );
  }

  // Pass 0 — research (best-effort): capture the client's CURRENT site + benchmark niche references
  // into a brief, so the director designs from the real brand instead of inventing one. Any failure
  // (bad URL, capture error) yields an empty brief and the director falls back to the audit summary.
  const researchBrief = await step.run('research', async () => {
    try {
      const rid = `${process.pid}-${Date.now()}`;
      const shots = await captureScreenshots(input.url);
      // Read ONLY the desktop shot — one full-page screenshot already costs ~150k vision tokens, and two
      // would blow past the model's 200k context window (the cause of an earlier silent research failure).
      const dOld = `/tmp/old-${rid}-d.png`;
      await writeFile(dOld, shots.desktop);
      await closeBrowser();
      const brief = await runAgent(vegaResearcher, { input, oldSitePngs: [dOld] });
      console.error('[demo-gen] research brief length:', brief.length);
      return brief;
    } catch (e) {
      console.error('[demo-gen] research pass failed (best-effort, continuing):', e instanceof Error ? e.message : e);
      return '';
    }
  });

  // Pass 0.5 — divergent concepting: explore 3 radically different big ideas + pick the boldest credible
  // one. Its own checkpointed step. Best-effort: if it fails, the director falls back to inventing the
  // direction (empty concept) so a concepting blip never sinks the run.
  const winningConcept = await step.run('concept', async () => {
    try {
      // Pick a random aesthetic lane so consecutive demos diverge in style (Math.random is fine here —
      // worker Node, not a replay-sensitive workflow script; a re-run intentionally varies anyway).
      const lane = STYLE_LANES[Math.floor(Math.random() * STYLE_LANES.length)];
      console.error('[demo-gen] style lane:', lane);
      const concepts = await runAgent(atlasConceptor, { input, researchBrief, styleProvocation: lane });
      const winner = extractWinner(concepts);
      console.error('[demo-gen] winning concept:', winner.slice(0, 300).replace(/\n/g, ' '));
      return winner;
    } catch (e) {
      console.error('[demo-gen] concept pass failed (best-effort, continuing):', e instanceof Error ? e.message : e);
      return '';
    }
  });

  // Pass 1 — Atlas expands the WINNING concept into the build spec (or invents the direction if empty).
  const spec = await step.run('director', () => runAgent(atlasDirector, { input, researchBrief, concept: winningConcept }));

  // Pass 2 — Nova builds the page from the spec. The expensive pass; checkpointed so a later failure
  // or a worker restart never re-spends it.
  const built = await step.run('build', () => runAgent(novaBuilder, { input, spec }));

  // Passes 3-5 — render, expert review board, synthesise, revise. Best-effort in one step: any failure
  // falls back to `built`, and the /tmp PNGs live only within this step.
  const reviewed = await step.run('review-revise', async () => {
    try {
      let current = built;
      // Passes 3-5, looped up to 2 rounds: render -> board review -> Atlas fix list -> Nova revise. The 2nd
      // round RE-REVIEWS the revised page (catches issues the first fix missed or introduced), stopping
      // early if the board flags nothing.
      for (let round = 1; round <= 2; round++) {
        const id = `${process.pid}-${Date.now()}-r${round}`;
        const desktopPngs = await renderHtmlToPng(current, `/tmp/demo-${id}-d.html`, `/tmp/demo-${id}-d.png`, DESKTOP_WIDTH);
        const mobilePngs = await renderHtmlToPng(current, `/tmp/demo-${id}-m.html`, `/tmp/demo-${id}-m.png`, MOBILE_WIDTH);
        const reviews = await runBoard(REVIEW_BOARD, { input, desktopPngs, mobilePngs });
        if (reviews.length === 0) break;
        if (boardPassesClean(reviews)) {
          console.error('[demo-gen] review round ' + round + ': board PASS (no blocker) — skipping synth+revise');
          break;
        }
        console.error('[demo-gen] review round ' + round + ': ' + reviews.length + ' lens critique(s)');
        const fixes = await runAgent(atlasSynthesizer, { input, reviews });
        current = await runAgent(novaReviser, { input, fixes, desktopPngs, mobilePngs, currentHtml: current });
      }
      return current;
    } catch {
      return built;
    }
  });

  // Pass 6 — deterministic LAYOUT GUARD (its own checkpointed step; runs REGARDLESS of whether the vision
  // board ran). A headless DOM audit measures real layout breakages the best-effort board can miss or skip
  // — horizontal overflow, text past the viewport edge, a decorative spine crossing a centered heading,
  // broken/zero-size images. If any are found, ONE surgical fix pass repairs them; the fix is kept only if
  // it actually reduced the defect count, so the guard can never ship a page worse than the board produced.
  return step.run('layout-guard', async () => {
    try {
      // Loop up to 2 fix passes, re-auditing each time and keeping ONLY an improvement, so the page can
      // never ship worse than the board produced and a residual (e.g. the mobile spine after the desktop
      // one is fixed) gets a second targeted pass.
      let best = reviewed;
      let defects = await auditLayout(best);
      for (let pass = 1; pass <= 2 && defects.length > 0; pass++) {
        console.error('[demo-gen] layout guard pass ' + pass + ': ' + defects.length + ' defect(s):', defects.slice(0, 4).map((d) => d.issue.slice(0, 60)).join(' | '));
        const fixed = await runAgent(novaLayoutFixer, { input, fixList: formatLayoutFixList(defects), currentHtml: best });
        const after = await auditLayout(fixed);
        if (after.length >= defects.length) {
          console.error('[demo-gen] layout guard: pass ' + pass + ' did not reduce defects (' + after.length + ') — keeping the previous page');
          break;
        }
        console.error('[demo-gen] layout guard: ' + defects.length + ' -> ' + after.length + ' defect(s) after pass ' + pass);
        best = fixed;
        defects = after;
      }

      // Web-app QA — console/JS errors, broken assets, basic a11y (complements the LAYOUT audit above).
      try {
        const qa = await runWebappQa(best);
        if (qa.length > 0) console.error('[demo-gen] webapp QA: ' + qa.length + ' finding(s): ' + formatQaReport(qa).slice(0, 240));
        if (hasBlockingQa(qa)) {
          // Use the QA-specific fixer: QA findings (JS errors, broken assets, missing alt/lang/h1) need
          // script/attribute edits the layout fixer's prompt explicitly forbids.
          const fixed = await runAgent(novaQaFixer, { input, fixList: formatQaReport(qa), currentHtml: best });
          // Keep the QA fix ONLY if it did not regress layout AND reduced blocking findings.
          if ((await auditLayout(fixed)).length <= defects.length && majorQaCount(await runWebappQa(fixed)) < majorQaCount(qa)) {
            console.error('[demo-gen] webapp QA: applied a fix pass (' + majorQaCount(qa) + ' major finding(s) before)');
            best = fixed;
          }
        }
      } catch (e) {
        console.error('[demo-gen] webapp QA failed (best-effort, continuing):', e instanceof Error ? e.message : e);
      }
      return best;
    } catch (e) {
      console.error('[demo-gen] layout guard failed (best-effort, continuing):', e instanceof Error ? e.message : e);
      return reviewed;
    }
  });
}

