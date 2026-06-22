// Output validators for agent defs — lifted verbatim from the demo-gen engine so behaviour is
// unchanged. Pure and tsx-safe (relative imports only, no `server-only`).
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
