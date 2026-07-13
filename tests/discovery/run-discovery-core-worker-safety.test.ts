import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

// The autonomous discovery cron runs inside the Inngest worker under tsx, where `import 'server-only'`
// THROWS and the `@/` path alias is NOT resolved (and `next/*` framework APIs aren't available). So every
// module the cron / discovery core loads AT RUNTIME must avoid all three. This walks that runtime import
// closure statically and fails if any reachable module re-introduces a worker-unsafe import — a class of
// bug typecheck can't catch, since it only surfaces when the worker container actually boots.
//
// Only RUNTIME edges are followed: `import type` / `export type` statements are erased by esbuild/tsx, so
// the files they point at are never loaded (a pure-types module may legitimately use `@/`).

const ROOT = resolve(__dirname, '..', '..');

// The worker entrypoint imports EVERY durable function it registers, so walking from it covers the whole
// worker runtime closure — every current function and any future one added to the entrypoint, automatically.
// The extra explicit entries are the web/worker-shared modules whose safety the entrypoint doesn't reach.
const ENTRY_FILES = [
  'lib/inngest/worker-entrypoint.ts',
  'lib/discovery/run-discovery-core.ts',
  'lib/inngest/start-pipeline-run.ts',
];

// Specifiers imported/re-exported at RUNTIME (type-only statements excluded). Side-effect imports too.
function runtimeSpecifiers(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?[\s\S]*?from\s*['"]([^'"]+)['"]/g)) {
    if (m[1]) continue; // `import type` / `export type` → erased, module not loaded
    out.push(m[2]);
  }
  for (const m of src.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) out.push(m[1]); // `import 'x'`
  return out;
}

function resolveRelative(spec: string, fromFile: string): string | null {
  if (!spec.startsWith('.')) return null; // package / node: builtin / @/ / next — not a source edge to walk
  const base = resolve(dirname(fromFile), spec);
  for (const cand of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(cand)) return cand;
  }
  return null;
}

function collectRuntimeGraph(entries: string[]): string[] {
  const visited = new Set<string>();
  const stack = entries.map((e) => resolve(ROOT, e));
  while (stack.length) {
    const file = stack.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    for (const spec of runtimeSpecifiers(readFileSync(file, 'utf8'))) {
      const next = resolveRelative(spec, file);
      if (next) stack.push(next);
    }
  }
  return [...visited];
}

const rel = (f: string) => relative(ROOT, f);

describe('discovery cron — worker-safe runtime import closure', () => {
  const graph = collectRuntimeGraph(ENTRY_FILES);

  it('walks a non-trivial module graph (the whole discovery chain, not just the entry files)', () => {
    expect(graph.length).toBeGreaterThan(10);
  });

  it('no reachable module imports `server-only`', () => {
    const offenders = graph.filter((f) => /(?:^|\n)\s*import\s+['"]server-only['"]/.test(readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('no reachable module uses the `@/` path alias at runtime (unresolved under tsx)', () => {
    const offenders = graph.filter((f) => runtimeSpecifiers(readFileSync(f, 'utf8')).some((s) => s.startsWith('@/')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('no reachable module imports `next/*` framework APIs', () => {
    const offenders = graph.filter((f) => runtimeSpecifiers(readFileSync(f, 'utf8')).some((s) => s.startsWith('next/')));
    expect(offenders.map(rel)).toEqual([]);
  });
});
