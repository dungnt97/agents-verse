import { describe, it, expect } from 'vitest';
import { formatQaReport, hasBlockingQa, majorQaCount, type QaFinding } from '@/lib/demo-gen/qa-findings';

const f = (category: QaFinding['category'], severity: QaFinding['severity'], detail: string): QaFinding => ({ category, severity, detail });

describe('formatQaReport', () => {
  it('returns empty string for no findings', () => {
    expect(formatQaReport([])).toBe('');
  });
  it('dedupes identical category+detail and orders major before minor, numbered', () => {
    const out = formatQaReport([
      f('a11y', 'minor', 'no lang'),
      f('asset', 'major', 'broken image x'),
      f('asset', 'major', 'broken image x'), // dup
      f('console', 'major', 'JS error y'),
    ]);
    const lines = out.split('\n');
    expect(lines).toHaveLength(3); // dup removed
    expect(lines[0]).toContain('[major');
    expect(lines[2]).toContain('[minor');
    expect(lines[0].startsWith('1.')).toBe(true);
  });
  it('sorts a major listed before a minor to the top (covers the major-first branch)', () => {
    const out = formatQaReport([f('console', 'major', 'js err'), f('a11y', 'minor', 'no lang')]);
    const lines = out.split('\n');
    expect(lines[0]).toContain('[major · console]');
    expect(lines[1]).toContain('[minor · a11y]');
  });

  it('caps the list', () => {
    const many = Array.from({ length: 20 }, (_, i) => f('a11y', 'minor', 'issue ' + i));
    expect(formatQaReport(many, 5).split('\n')).toHaveLength(5);
  });
});

describe('hasBlockingQa', () => {
  it('is true when any finding is major', () => {
    expect(hasBlockingQa([f('a11y', 'minor', 'a'), f('console', 'major', 'b')])).toBe(true);
  });
  it('is false when all are minor or empty', () => {
    expect(hasBlockingQa([f('a11y', 'minor', 'a')])).toBe(false);
    expect(hasBlockingQa([])).toBe(false);
  });
});

describe('majorQaCount', () => {
  it('counts distinct major findings only, ignoring minors and dupes', () => {
    expect(majorQaCount([
      f('asset', 'major', 'x'),
      f('asset', 'major', 'x'), // dup
      f('console', 'major', 'y'),
      f('a11y', 'minor', 'z'),
    ])).toBe(2);
  });
});
