// Pure layout-defect model + formatting (no browser, no I/O). Kept separate from layout-audit.ts (which
// launches Playwright) so this logic stays unit-testable. tsx-safe: relative imports, no `server-only`.

export type DefectSeverity = 'major' | 'minor';

export interface LayoutDefect {
  viewport: 'desktop' | 'mobile';
  severity: DefectSeverity;
  selector: string;
  issue: string;
}

// De-duplicate (same issue text at the same severity, regardless of viewport), then order major-first and
// cap the list so the fixer commits to the real breakages instead of a long tail. Returns a numbered,
// builder-ready fix list (empty string when there is nothing to fix).
export function formatLayoutFixList(defects: LayoutDefect[], cap = 8): string {
  const seen = new Set<string>();
  const unique: LayoutDefect[] = [];
  for (const d of defects) {
    const key = `${d.severity}|${d.issue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(d);
  }
  unique.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'major' ? -1 : 1));
  return unique
    .slice(0, cap)
    .map((d, i) => `${i + 1}. [${d.severity} · ${d.viewport}] ${d.selector} — ${d.issue}`)
    .join('\n');
}

// True when the audit surfaced at least one blocking (major) defect worth a fix pass.
export function hasBlockingDefects(defects: LayoutDefect[]): boolean {
  return defects.some((d) => d.severity === 'major');
}
