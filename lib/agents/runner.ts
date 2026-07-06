// The shared agent runtime: one place that shells out to the `claude` CLI on the user's subscription
// (CLAUDE_CODE_OAUTH_TOKEN, no metered key). Lifted verbatim from the demo-gen engine, parameterised by
// the AgentDef's model/tools/limits. WORKER-ONLY: relative imports + no `server-only` (runs under tsx).
import { spawn } from 'node:child_process';
import type { AgentContext, AgentDef, AgentLimits, AgentModel, AgentTool } from './types';

// Resolve the model name actually passed to `--model`. When the worker routes through a gateway
// (9router) the tier maps to a configured model/combo id via `AGENT_MODEL_<TIER>` (e.g.
// AGENT_MODEL_OPUS=my-combo); unset falls back to the native CLI name (direct Claude Code subscription).
function resolveModel(model: AgentModel): string {
  const override = process.env[`AGENT_MODEL_${model.toUpperCase()}`];
  return override?.trim() || model;
}

// Pull the assistant text out of the `--output-format json` envelope. JSON mode is required: plain
// text print mode drops the START of long output when captured non-interactively.
function resultText(stdout: string): string {
  const j = JSON.parse(stdout) as { result?: string; is_error?: boolean; error?: string };
  if (j.is_error) throw new Error(`claude error: ${j.result ?? j.error ?? 'unknown'}`);
  // Some providers (e.g. Kiro) prepend a <thinking>…</thinking> block; strip it so spec/review text is clean.
  return (j.result ?? '').replace(/^\s*<thinking>[\s\S]*?<\/thinking>\s*/i, '').trim();
}

// One `claude -p` call. Prompt is piped over stdin (robust for very long prompts). Returns the
// assistant's final text. Rejects on a missing CLI, a non-zero exit, a CLI-reported error, or timeout.
function runClaude(prompt: string, model: AgentModel, tools: AgentTool[], limits: AgentLimits, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['-p', '--model', resolveModel(model), '--output-format', 'json', '--max-turns', String(limits.maxTurns)];
    if (tools.length > 0) args.push('--allowedTools', tools.join(' '));
    const child = spawn('claude', args, { env: process.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), limits.timeoutMs);
    const onAbort = () => child.kill('SIGKILL');
    signal?.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (err) => {
      cleanup();
      reject(new Error(`claude CLI not runnable: ${err.message}`));
    });
    child.on('close', (code, signal) => {
      cleanup();
      if (code !== 0) {
        // Surface everything diagnostic: signal (SIGKILL = our timeout/abort), stderr, AND stdout — the
        // CLI frequently writes the real failure (auth/gateway/limit) to stdout even on a non-zero exit,
        // so discarding it left "exited 1" with no cause.
        const detail = [
          signal ? `signal=${signal}` : '',
          stderr.trim() ? `stderr=${stderr.trim().slice(0, 600)}` : '',
          stdout.trim() ? `stdout=${stdout.trim().slice(0, 600)}` : '',
        ]
          .filter(Boolean)
          .join(' | ');
        reject(new Error(`claude exited ${code}${detail ? ` — ${detail}` : ' — (no output)'}`));
        return;
      }
      try {
        resolve(resultText(stdout));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
    // If the CLI dies before consuming stdin (spawn ENOENT, an instant auth/gateway failure, or our own
    // SIGKILL mid-write), Node emits 'error' (EPIPE / ERR_STREAM_DESTROYED) on the stdin stream. With no
    // listener that becomes an uncaughtException that kills the whole worker container, taking down every
    // concurrent run; the close/error handlers already produce the diagnostic rejection, so swallow it.
    child.stdin.on('error', () => {});
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Run one agent with retries on ANY transient failure — a CLI/gateway blip OR an unusable output (e.g.
// a truncated HTML document that fails validation). Retrying the whole call+validate rescues an
// otherwise-dead expensive run; the backoff lets a gateway token refresh recover between attempts.
export async function runAgent<I, O>(def: AgentDef<I, O>, input: I, ctx?: AgentContext): Promise<O> {
  const attempts = 5;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = await runClaude(def.buildPrompt(input), def.model, def.tools, def.limits, ctx?.signal);
      return def.validate(raw);
    } catch (e) {
      lastErr = e;
      // Log every attempt (with the agent id) so a failing pass is identifiable + its cause visible,
      // instead of only the final error bubbling up opaquely.
      console.error(`[agent ${def.id}] attempt ${i + 1}/${attempts} failed: ${e instanceof Error ? e.message : String(e)}`);
      // Exponential backoff (capped at 30s) — a transient gateway spike (a `503 high demand`, or a
      // dropped connection that surfaces as a no-output `exited 1`) lasts seconds-to-minutes, so ride it
      // out within the pass (≈65s across the retries) instead of failing the whole ~20-32 min run.
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, Math.min(30_000, 5000 * 2 ** i)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// Run a panel of agents in parallel, best-effort: any that fail or return unusable output are dropped
// (the demo pipeline tolerates a missing reviewer and falls back to the built page). Surviving outputs
// are returned in board order.
export async function runBoard<I, O>(defs: AgentDef<I, O>[], input: I, ctx?: AgentContext): Promise<O[]> {
  const settled = await Promise.allSettled(defs.map((d) => runAgent(d, input, ctx)));
  // `value` is `Awaited<O>`; an agent output is never itself a promise, so it is exactly `O`.
  return settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value as O] : []));
}
