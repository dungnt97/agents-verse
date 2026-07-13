import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACTIVE_RUN_STATUSES } from '@/lib/inngest/pipeline-machine';

// F1 — ACTIVE_RUN_STATUSES is load-bearing DDL: the `pipeline_runs_active_lead_idx` partial-unique index
// (which enforces at most one active run per lead) is generated from it. If the constant changes without a
// new migration recreating the index, the DB predicate and the code silently diverge and duplicate runs
// slip through. This links the constant to the actual applied index DDL so that can't happen unnoticed.
describe('ACTIVE_RUN_STATUSES matches the applied index predicate (F1)', () => {
  it('the pipeline_runs_active_lead_idx predicate lists exactly ACTIVE_RUN_STATUSES', () => {
    const dir = resolve(__dirname, '..', '..', 'drizzle', 'migrations');
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(resolve(dir, f), 'utf8'))
      .find((s) => s.includes('pipeline_runs_active_lead_idx'));
    expect(sql, 'a migration must define pipeline_runs_active_lead_idx').toBeTruthy();

    // Pull the `status in ('a', 'b', ...)` list out of the CREATE ... WHERE predicate.
    const m = /pipeline_runs_active_lead_idx[\s\S]*?status"?\s+in\s*\(([^)]+)\)/i.exec(sql as string);
    expect(m, 'the index must carry a `status in (...)` predicate').toBeTruthy();
    const inMigration = (m as RegExpExecArray)[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).sort();

    expect(inMigration).toEqual([...ACTIVE_RUN_STATUSES].sort());
  });
});
