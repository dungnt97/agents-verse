// The demo-generation pipeline, re-expressed over the shared agent runtime. Behaviour is identical to
// the previous single-file engine: Atlas specs → Nova builds → the niche-aware review board critiques
// the rendered screenshots in parallel → Atlas synthesises a prioritized fix list → Nova revises.
// Passes 3-5 are best-effort and fall back to the solid built page, so the result is never worse than a
// single build. WORKER-ONLY (shells `claude`): relative imports, no `server-only`. Never import from web.
import { atlasDirector, atlasSynthesizer } from '../defs/atlas-strategist';
import { novaBuilder, novaReviser } from '../defs/nova-designer';
import { REVIEW_BOARD } from '../board';
import { runAgent, runBoard } from '../runner';
import { renderHtmlToPng, DESKTOP_WIDTH, MOBILE_WIDTH } from '../../demo-gen/render';
import { captureScreenshots, closeBrowser } from '../../audit/screenshot';
import { vegaResearcher } from '../defs/vega-researcher';
import { writeFile } from 'node:fs/promises';
import type { DemoGenInput } from '../../demo-gen/prompt';

export async function generateDemoHtml(input: DemoGenInput): Promise<string> {
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
  let researchBrief = '';
  try {
    const rid = `${process.pid}-${Date.now()}`;
    const shots = await captureScreenshots(input.url);
    // Read ONLY the desktop shot — one full-page screenshot already costs ~150k vision tokens, and two
    // would blow past the model's 200k context window (the cause of an earlier silent research failure).
    const dOld = `/tmp/old-${rid}-d.png`;
    await writeFile(dOld, shots.desktop);
    await closeBrowser();
    researchBrief = await runAgent(vegaResearcher, { input, oldSitePngs: [dOld] });
  } catch (e) {
    console.error('[demo-gen] research pass failed (best-effort, continuing):', e instanceof Error ? e.message : e);
    researchBrief = '';
  }
  console.error('[demo-gen] research brief length:', researchBrief.length);

  // Pass 1 — Atlas writes the creative-director spec from the research brief.
  const spec = await runAgent(atlasDirector, { input, researchBrief });

  // Pass 2 — Nova builds the page from the spec.
  const built = await runAgent(novaBuilder, { input, spec });

  // Passes 3-5 — render, expert review board, synthesise, revise. Best-effort: fall back to `built`.
  try {
    const id = `${process.pid}-${Date.now()}`;
    const desktopPngs = await renderHtmlToPng(built, `/tmp/demo-${id}-d.html`, `/tmp/demo-${id}-d.png`, DESKTOP_WIDTH);
    const mobilePngs = await renderHtmlToPng(built, `/tmp/demo-${id}-m.html`, `/tmp/demo-${id}-m.png`, MOBILE_WIDTH);

    // Pass 3 — the niche-aware board reviews every page slice in parallel (independent lenses).
    const reviews = await runBoard(REVIEW_BOARD, { input, desktopPngs, mobilePngs });
    if (reviews.length === 0) return built;

    // Pass 4 — Atlas consolidates the board into one prioritized fix list.
    const fixes = await runAgent(atlasSynthesizer, { input, reviews });

    // Pass 5 — Nova revises the page to satisfy the fixes (sees the slices too).
    return await runAgent(novaReviser, { input, fixes, desktopPngs, mobilePngs, currentHtml: built });
  } catch {
    return built;
  }
}
