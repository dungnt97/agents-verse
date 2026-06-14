import { describe, it, expect } from 'vitest';

import { buildVisionPrompt } from '@/lib/audit/scoring-rubric';

// `buildVisionPrompt` assembles the Gemini vision-scoring prompt: it interpolates the caller's
// `company` and `industry` into a fixed template that names the five scoring dimensions, the
// 0-100 calibrated bands, the extra `problems`/`summary` outputs, and a JSON-only instruction.
// These assertions pin the real substrings the implementation emits so accidental edits to the
// rubric (which would silently change how Gemini scores) are caught.

describe('buildVisionPrompt', () => {
  it('interpolates the provided company and industry', () => {
    const prompt = buildVisionPrompt({ company: 'Acme Widgets Co', industry: 'dental clinic' });
    // The company name is wrapped in quotes in the opening line.
    expect(prompt).toContain('"Acme Widgets Co"');
    // The industry appears in the opening line and again in the content/visitor lines.
    expect(prompt).toContain('a dental clinic business');
    expect(prompt).toContain('for a dental clinic visitor');
  });

  it('interpolates industry into both the opening sentence and the content dimension', () => {
    const prompt = buildVisionPrompt({ company: 'X', industry: 'PLUMBING' });
    // The industry token lands in exactly two slots: the opening "a {industry} business"
    // sentence and the content dimension's "for a {industry} visitor".
    const occurrences = prompt.split('PLUMBING').length - 1;
    expect(occurrences).toBe(2);
  });

  it('includes the two-screenshot ordering instruction (desktop then mobile)', () => {
    const prompt = buildVisionPrompt({ company: 'C', industry: 'i' });
    expect(prompt).toContain('two screenshots: first DESKTOP, then MOBILE.');
  });

  it('states the 0-100 scale and the calibrated bands', () => {
    const prompt = buildVisionPrompt({ company: 'C', industry: 'i' });
    expect(prompt).toContain('Score each dimension 0-100 (higher = better), calibrated:');
    expect(prompt).toContain('0-40 poor');
    expect(prompt).toContain('40-60 mediocre');
    expect(prompt).toContain('60-80 decent');
    expect(prompt).toContain('80-100 excellent');
  });

  it('asks for all five scoring dimensions', () => {
    const prompt = buildVisionPrompt({ company: 'C', industry: 'i' });
    for (const dim of ['- visual:', '- cta:', '- trust:', '- content:', '- conversion:']) {
      expect(prompt, `missing dimension line ${dim}`).toContain(dim);
    }
  });

  it('asks for the problems and summary extras with their expected shape', () => {
    const prompt = buildVisionPrompt({ company: 'C', industry: 'i' });
    expect(prompt).toContain('- problems: 3-6 specific, actionable issues (short strings).');
    expect(prompt).toContain('- summary: 1-2 sentences');
  });

  it('instructs the model to return ONLY the JSON object matching the schema', () => {
    const prompt = buildVisionPrompt({ company: 'C', industry: 'i' });
    expect(prompt).toContain('Return ONLY the JSON object matching the schema.');
  });

  it('is deterministic: identical inputs produce identical output', () => {
    const opts = { company: 'Repeatable Inc', industry: 'logistics' };
    expect(buildVisionPrompt(opts)).toBe(buildVisionPrompt(opts));
  });

  it('output changes when inputs change', () => {
    const a = buildVisionPrompt({ company: 'Alpha', industry: 'retail' });
    const b = buildVisionPrompt({ company: 'Beta', industry: 'retail' });
    const c = buildVisionPrompt({ company: 'Alpha', industry: 'finance' });
    expect(a).not.toBe(b); // company differs
    expect(a).not.toBe(c); // industry differs
  });

  it('handles empty-string inputs without throwing and still emits the structural anchors', () => {
    let prompt = '';
    expect(() => {
      prompt = buildVisionPrompt({ company: '', industry: '' });
    }).not.toThrow();
    // The fixed scaffold survives even when both interpolated values are blank.
    expect(prompt).toContain('Score each dimension 0-100 (higher = better), calibrated:');
    expect(prompt).toContain('Return ONLY the JSON object matching the schema.');
    // Empty company still renders the quote pair, empty industry still renders the surrounding words.
    expect(prompt).toContain('homepage of ""');
    expect(prompt).toContain('a  business');
  });

  it('joins the template lines with newlines (multi-line prompt)', () => {
    const prompt = buildVisionPrompt({ company: 'C', industry: 'i' });
    expect(prompt).toContain('\n');
    // The opening line and the JSON instruction sit on separate lines.
    const lines = prompt.split('\n');
    expect(lines[0]).toMatch(/^You are a senior web-design and conversion auditor/);
    expect(lines[lines.length - 1]).toContain('Return ONLY the JSON object matching the schema.');
  });
});
