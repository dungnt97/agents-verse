// Output validators for agent defs — lifted verbatim from the demo-gen engine so behaviour is
// unchanged. Pure and tsx-safe (relative imports only, no `server-only`).
import type { ZodType } from 'zod';
import type { OutputValidator } from './types';

// Keep from the first HTML root marker onward, stripping a wrapping markdown fence / leading prose.
function extractHtml(raw: string): string {
  let out = raw.trim();
  const fence = out.match(/```(?:html)?\s*([\s\S]*?)```\s*$/i);
  if (fence) out = fence[1].trim();
  const start = out.search(/<!doctype html|<html[\s>]/i);
  if (start > 0) out = out.slice(start);
  return out.trim();
}

// Validate a complete HTML document — same thresholds the single-pass engine enforced.
export function makeHtmlValidator(): OutputValidator<string> {
  return (raw) => {
    const html = extractHtml(raw);
    if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html) || html.length < 500) {
      throw new Error(`output is not a complete HTML document (${html.length} chars)`);
    }
    return html;
  };
}

// Validate non-empty free text. The review board uses this: an empty/failed review throws and is then
// dropped by `runBoard` (best-effort), matching the old `.catch(() => '').filter(Boolean)`.
export function makeTextValidator(): OutputValidator<string> {
  return (raw) => {
    const text = raw.trim();
    if (!text) throw new Error('agent returned empty text');
    return text;
  };
}

// Validate a structured JSON object against a zod schema: strip a markdown fence / surrounding prose,
// JSON.parse, then schema.parse (throws → runAgent retries). Used by agents that must return a typed
// result the pipeline acts on (e.g. the Closer's recommended deal stage — an invalid stage can never
// silently advance a deal because the schema rejects it).
export function makeJsonValidator<O>(schema: ZodType<O>): OutputValidator<O> {
  return (raw) => {
    let s = raw.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```\s*$/i);
    if (fence) s = fence[1].trim();
    // Tolerate leading/trailing prose by slicing to the outermost object braces.
    const open = s.indexOf('{');
    const close = s.lastIndexOf('}');
    if (open >= 0 && close > open) s = s.slice(open, close + 1);
    let parsed: unknown;
    try {
      parsed = JSON.parse(s);
    } catch (e) {
      /* v8 ignore next -- defensive: JSON.parse only throws an Error, so String(e) is unreachable */
      throw new Error(`agent output is not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
    }
    return schema.parse(parsed);
  };
}