import { describe, it, expect } from 'vitest';
import { formatLayoutFixList, hasBlockingDefects, type LayoutDefect } from '@/lib/demo-gen/layout-defects';
import { buildLayoutFixPrompt } from '@/lib/demo-gen/prompt';
import type { DemoGenInput } from '@/lib/demo-gen/prompt';

const D = (over: Partial<LayoutDefect> = {}): LayoutDefect => ({
  viewport: 'desktop', severity: 'major', selector: 'h2.title', issue: 'spine crosses the heading', ...over,
});

describe('formatLayoutFixList', () => {
  it('returns an empty string when there are no defects', () => {
    expect(formatLayoutFixList([])).toBe('');
  });

  it('numbers defects, tags severity + viewport, and leads with major over minor', () => {
    const out = formatLayoutFixList([
      D({ severity: 'minor', viewport: 'mobile', selector: 'a.nav', issue: 'nav label wraps' }),
      D({ severity: 'major', selector: 'document', issue: 'page scrolls horizontally' }),
    ]);
    const lines = out.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('1. [major · desktop] document — page scrolls horizontally');
    expect(lines[1]).toContain('2. [minor · mobile] a.nav — nav label wraps');
  });

  it('de-duplicates by severity+issue and caps the list', () => {
    const dup = [D(), D({ viewport: 'mobile' })]; // same severity+issue, different viewport → one line
    expect(formatLayoutFixList(dup).split('\n')).toHaveLength(1);
    const many = Array.from({ length: 12 }, (_, i) => D({ issue: 'defect ' + i }));
    expect(formatLayoutFixList(many, 5).split('\n')).toHaveLength(5);
  });
});

describe('hasBlockingDefects', () => {
  it('is true only when a major defect is present', () => {
    expect(hasBlockingDefects([])).toBe(false);
    expect(hasBlockingDefects([D({ severity: 'minor' })])).toBe(false);
    expect(hasBlockingDefects([D({ severity: 'minor' }), D({ severity: 'major' })])).toBe(true);
  });
});

describe('buildLayoutFixPrompt', () => {
  const input = {
    company: 'Highlands Coffee', industry: 'coffee', city: 'HCMC', url: 'https://x.test',
    scores: { visual: 40, mobile: 50, cta: 30, trust: 60, seo: 70, speed: 20, content: 55, conversion: 35 },
    problems: ['p1'], redesign: { style: 's', sections: ['Hero'], cta: 'Order', content: 'warm', template: 'cafe' },
    summary: 'sum',
  } as unknown as DemoGenInput;

  it('embeds the brand, the fix list, and the current HTML, and forbids tool use', () => {
    const out = buildLayoutFixPrompt(input, '1. [major] fix the spine', '<html><body>old</body></html>');
    expect(out).toContain('Highlands Coffee');
    expect(out).toContain('1. [major] fix the spine');
    expect(out).toContain('<html><body>old</body></html>');
    expect(out).toContain('Fix EXACTLY these defects and NOTHING else');
    expect(out).toMatch(/do NOT call any tools/i);
  });
});

import { novaLayoutFixer } from '@/lib/agents/defs/nova-designer';

describe('novaLayoutFixer def', () => {
  const input = {
    company: 'X Co', industry: 'cafe', city: 'HCMC', url: 'https://x.test',
    scores: { visual: 40, mobile: 50, cta: 30, trust: 60, seo: 70, speed: 20, content: 55, conversion: 35 },
    problems: ['p'], redesign: { style: 's', sections: ['Hero'], cta: 'Order', content: 'warm', template: 'cafe' },
    summary: 'sum',
  } as unknown as DemoGenInput;

  it('is an opus, no-tools agent whose buildPrompt produces a surgical layout-fix prompt', () => {
    expect(novaLayoutFixer.id).toBe('nova');
    expect(novaLayoutFixer.model).toBe('opus');
    expect(novaLayoutFixer.tools).toEqual([]);
    const p = novaLayoutFixer.buildPrompt({ input, fixList: '1. [major] spine crosses heading', currentHtml: '<html><body>x</body></html>' });
    expect(p).toContain('1. [major] spine crosses heading');
    expect(p).toContain('<html><body>x</body></html>');
    expect(p).toContain('X Co');
  });
});

describe('formatLayoutFixList sort stability (major-before-minor input)', () => {
  it('keeps major first when the input is already major-then-minor', () => {
    const out = formatLayoutFixList([
      { viewport: 'desktop', severity: 'major', selector: 'document', issue: 'overflow' },
      { viewport: 'desktop', severity: 'minor', selector: 'a', issue: 'wrap' },
    ]);
    const lines = out.split('\n');
    expect(lines[0]).toContain('[major');
    expect(lines[1]).toContain('[minor');
  });
});
