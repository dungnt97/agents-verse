// Multi-pass demo-generation engine. WORKER-ONLY: shells out to the `claude` CLI (Claude Code),
// running on the user's subscription via CLAUDE_CODE_OAUTH_TOKEN — no metered API key. Relative
// imports + no `server-only` so it is safe in the worker tsx chain. Never import this from `web`.
//
// Pipeline: art-direction DNA → (1) creative-director spec → (2) build → (3) render desktop+mobile and
// run a niche-aware EXPERT REVIEW BOARD (UI/UX, copywriter, domain expert, art director) in parallel →
// (4) synthesise a prioritized fix list → (5) revise. Stages 3-5 are best-effort: any failure falls
// back to the solid pass-2 page, so the result is never worse than a single-pass build.
import { spawn } from 'node:child_process';
import {
  buildDirectorPrompt,
  buildBuildPrompt,
  buildPersonaReviewPrompt,
  buildReviewSynthesisPrompt,
  buildRevisePrompt,
  REVIEW_PERSONAS,
  type DemoGenInput,
} from './prompt';
import { artDirectionFor } from './art-direction';
import { renderHtmlToPng } from './render';

const MODEL = 'opus';

interface RunOpts {
  timeoutMs: number;
  maxTurns: number;
  allowRead?: boolean; // review/revise passes need the Read tool to view the screenshots
}

// Pull the assistant text out of the `--output-format json` envelope. JSON mode is required: plain
// text print mode drops the START of long output when captured non-interactively.
function resultText(stdout: string): string {
  const j = JSON.parse(stdout) as { result?: string; is_error?: boolean; error?: string };
  if (j.is_error) throw new Error(`claude error: ${j.result ?? j.error ?? 'unknown'}`);
  return (j.result ?? '').trim();
}

// Strip a wrapping markdown fence / leading prose, keeping from the first HTML root marker onward.
function extractHtml(raw: string): string {
  let out = raw.trim();
  const fence = out.match(/```(?:html)?\s*([\s\S]*?)```\s*$/i);
  if (fence) out = fence[1].trim();
  const start = out.search(/<!doctype html|<html[\s>]/i);
  if (start > 0) out = out.slice(start);
  return out.trim();
}

function assertCompleteHtml(html: string): void {
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html) || html.length < 500) {
    throw new Error(`output is not a complete HTML document (${html.length} chars)`);
  }
}

// One `claude -p` call. Prompt is piped over stdin (robust for very long prompts). Returns the
// assistant's final text. Rejects on a missing CLI, a non-zero exit, a CLI-reported error, or timeout.
function runClaude(prompt: string, opts: RunOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', MODEL, '--output-format', 'json', '--max-turns', String(opts.maxTurns)];
    if (opts.allowRead) args.push('--allowedTools', 'Read');
    const child = spawn('claude', args, { env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`claude CLI not runnable: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude exited ${code}${stderr ? ` — ${stderr.slice(0, 300)}` : ''}`));
        return;
      }
      try {
        resolve(resultText(stdout));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function generateDemoHtml(input: DemoGenInput): Promise<string> {
  if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    throw new Error('CLAUDE_CODE_OAUTH_TOKEN is not set — run `claude setup-token` and add it to .env.local');
  }
  const dna = artDirectionFor(input.industry);

  // Pass 1 — creative-director spec (text, fast).
  const spec = await runClaude(buildDirectorPrompt(input, dna), { timeoutMs: 180_000, maxTurns: 1 });

  // Pass 2 — build the page from the spec.
  const built = extractHtml(await runClaude(buildBuildPrompt(input, dna, spec), { timeoutMs: 300_000, maxTurns: 1 }));
  assertCompleteHtml(built);

  // Passes 3-5 — render, expert review board, synthesise, revise. Best-effort: fall back to `built`.
  try {
    const id = `${process.pid}-${Date.now()}`;
    const dPng = `/tmp/demo-${id}-d.png`;
    const mPng = `/tmp/demo-${id}-m.png`;
    await renderHtmlToPng(built, `/tmp/demo-${id}-d.html`, dPng, 1440);
    await renderHtmlToPng(built, `/tmp/demo-${id}-m.html`, mPng, 390);

    // Pass 3 — the niche-aware expert board reviews the screenshots in parallel (independent lenses).
    const reviews = (
      await Promise.all(
        REVIEW_PERSONAS.map((p) =>
          runClaude(buildPersonaReviewPrompt(p, input, dPng, mPng), {
            timeoutMs: 240_000,
            maxTurns: 4,
            allowRead: true,
          }).catch(() => ''),
        ),
      )
    ).filter(Boolean);
    if (reviews.length === 0) return built;

    // Pass 4 — consolidate into one prioritized fix list.
    const fixes = await runClaude(buildReviewSynthesisPrompt(input, reviews), { timeoutMs: 180_000, maxTurns: 1 });

    // Pass 5 — revise the page to satisfy the fixes (sees the screenshots too).
    const revised = extractHtml(
      await runClaude(buildRevisePrompt(input, dna, fixes, dPng, mPng, built), {
        timeoutMs: 420_000,
        maxTurns: 10,
        allowRead: true,
      }),
    );
    assertCompleteHtml(revised);
    return revised;
  } catch {
    return built;
  }
}
