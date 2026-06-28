// Pure web-app-QA model + formatting (no browser, no I/O). Kept separate from webapp-qa.ts (which launches
// Playwright) so this stays unit-testable. Complements layout-defects.ts: that one is about LAYOUT; this is
// about runtime health — console/JS errors, broken assets, and basic accessibility. tsx-safe.

export type QaSeverity = 'major' | 'minor';
export type QaCategory = 'console' | 'asset' | 'a11y';

export interface QaFinding {
  category: QaCategory;
  severity: QaSeverity;
  detail: string;
}

// De-duplicate (same category + detail, regardless of viewport), order major-first, cap the list, and
// return a numbered, builder-ready fix report (empty string when there is nothing to fix).
export function formatQaReport(findings: QaFinding[], cap = 12): string {
  const seen = new Set<string>();
  const unique: QaFinding[] = [];
  for (const f of findings) {
    const key = `${f.category}|${f.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }
  unique.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'major' ? -1 : 1));
  return unique
    .slice(0, cap)
    .map((f, i) => `${i + 1}. [${f.severity} · ${f.category}] ${f.detail}`)
    .join('\n');
}

// True when QA surfaced at least one blocking (major) finding worth a fix pass.
export function hasBlockingQa(findings: QaFinding[]): boolean {
  return findings.some((f) => f.severity === 'major');
}

// Count of distinct (category|detail) MAJOR findings — used to decide whether a fix pass actually helped.
export function majorQaCount(findings: QaFinding[]): number {
  const seen = new Set<string>();
  for (const f of findings) if (f.severity === 'major') seen.add(`${f.category}|${f.detail}`);
  return seen.size;
}
