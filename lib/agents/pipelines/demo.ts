// The demo-generation pipeline, re-expressed over the shared agent runtime. Behaviour is identical to
// the previous single-file engine: Atlas specs → Nova builds → the niche-aware review board critiques
// the rendered screenshots in parallel → Atlas synthesises a prioritized fix list → Nova revises.
// Passes 3-5 are best-effort and fall back to the solid built page, so the result is never worse than a
// single build. WORKER-ONLY (shells `claude`): relative imports, no `server-only`. Never import from web.
import { atlasDirector, atlasSynthesizer } from '../defs/atlas-strategist';
import { novaBuilder, novaReviser } from '../defs/nova-designer';
import { REVIEW_BOARD } from '../board';
import { runAgent, runBoard } from '../runner';
import { renderHtmlToPng } from '../../demo-gen/render';
import { artDirectionFor } from '../../demo-gen/art-direction';
import type { DemoGenInput } from '../../demo-gen/prompt';

export async function generateDemoHtml(input: DemoGenInput): Promise<string> {
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error('CLAUDE_CODE_OAUTH_TOKEN is not set — run `claude setup-token` and add it to .env.local');
  }
  const dna = artDirectionFor(input.industry);

  // Pass 1 — Atlas writes the creative-director spec (text, fast).
  const spec = await runAgent(atlasDirector, { input, dna });

  // Pass 2 — Nova builds the page from the spec.
  const built = await runAgent(novaBuilder, { input, dna, spec });

  // Passes 3-5 — render, expert review board, synthesise, revise. Best-effort: fall back to `built`.
  try {
    const id = `${process.pid}-${Date.now()}`;
    const desktopPng = `/tmp/demo-${id}-d.png`;
    const mobilePng = `/tmp/demo-${id}-m.png`;
    await renderHtmlToPng(built, `/tmp/demo-${id}-d.html`, desktopPng, 1440);
    await renderHtmlToPng(built, `/tmp/demo-${id}-m.html`, mobilePng, 390);

    // Pass 3 — the niche-aware board reviews both screenshots in parallel (independent lenses).
    const reviews = await runBoard(REVIEW_BOARD, { input, desktopPng, mobilePng });
    if (reviews.length === 0) return built;

    // Pass 4 — Atlas consolidates the board into one prioritized fix list.
    const fixes = await runAgent(atlasSynthesizer, { input, reviews });

    // Pass 5 — Nova revises the page to satisfy the fixes (sees the screenshots too).
    return await runAgent(novaReviser, { input, dna, fixes, desktopPng, mobilePng, currentHtml: built });
  } catch {
    return built;
  }
}
