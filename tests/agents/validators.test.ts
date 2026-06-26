import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  makeHtmlValidator,
  makeTextValidator,
  makeJsonValidator,
} from '@/lib/agents/validators';

// These validators decide what a model response is allowed to become before the pipeline acts on it,
// so each branch matters: an HTML page must be a complete document, review text must be non-empty, and
// a typed JSON result must survive both JSON.parse and the zod schema. The cases below pin every path
// in extractHtml (exercised via the HTML validator), the length/tag thresholds, fence + prose
// stripping, and the JSON parse/validation failure modes.

const FILLER = 'x'.repeat(600); // pushes a doc comfortably over the 500-char minimum

describe('makeHtmlValidator', () => {
  const validate = makeHtmlValidator();

  it('accepts a complete HTML document and returns it trimmed', () => {
    const doc = `<!doctype html><html><head></head><body>${FILLER}</body></html>`;
    expect(validate(`   ${doc}   `)).toBe(doc);
  });

  it('strips a ```html fenced block before validating', () => {
    const doc = `<!doctype html><html><body>${FILLER}</body></html>`;
    expect(validate('```html\n' + doc + '\n```')).toBe(doc);
  });

  it('strips a bare ``` fenced block (no language tag)', () => {
    const doc = `<html lang="en"><body>${FILLER}</body></html>`;
    expect(validate('```\n' + doc + '\n```')).toBe(doc);
  });

  it('slices leading prose before the <!doctype html> marker', () => {
    const doc = `<!doctype html><html><body>${FILLER}</body></html>`;
    expect(validate(`Here is your page:\n\n${doc}`)).toBe(doc);
  });

  it('slices leading prose before a <html ...> marker', () => {
    const doc = `<html lang="en"><body>${FILLER}</body></html>`;
    expect(validate(`blah blah ${doc}`)).toBe(doc);
  });

  it('does not slice when the document already starts at the marker (start === 0)', () => {
    const doc = `<html><body>${FILLER}</body></html>`;
    expect(validate(doc)).toBe(doc);
  });

  it('throws when there is no opening <html> tag', () => {
    const noHtml = `<!doctype html><body>${FILLER}</body></html>`;
    expect(() => validate(noHtml)).toThrow(/not a complete HTML document/);
  });

  it('throws when there is no closing </html> tag', () => {
    const noClose = `<html><body>${FILLER}</body>`;
    expect(() => validate(noClose)).toThrow(/not a complete HTML document/);
  });

  it('throws when the document is under the 500-char minimum', () => {
    const tooShort = '<html><body>tiny</body></html>';
    expect(() => validate(tooShort)).toThrow(/not a complete HTML document/);
    // The thrown message reports the measured length.
    expect(() => validate(tooShort)).toThrow(new RegExp(`\\(${tooShort.length} chars\\)`));
  });

  it('throws on empty input', () => {
    expect(() => validate('   ')).toThrow(/\(0 chars\)/);
  });
});

describe('makeTextValidator', () => {
  const validate = makeTextValidator();

  it('returns trimmed non-empty text', () => {
    expect(validate('  hello world  ')).toBe('hello world');
  });

  it('preserves inner content while trimming the edges', () => {
    expect(validate('\n\tA review of the page.\n')).toBe('A review of the page.');
  });

  it('throws on an empty string', () => {
    expect(() => validate('')).toThrow(/empty text/);
  });

  it('throws on whitespace-only input', () => {
    expect(() => validate('   \n\t  ')).toThrow(/empty text/);
  });
});

describe('makeJsonValidator', () => {
  const schema = z.object({
    stage: z.enum(['won', 'lost', 'negotiating']),
    confidence: z.number().min(0).max(1),
  });
  const validate = makeJsonValidator(schema);
  const value = { stage: 'won' as const, confidence: 0.9 };

  it('parses clean JSON and validates against the schema', () => {
    expect(validate(JSON.stringify(value))).toEqual(value);
  });

  it('tolerates a ```json fenced block', () => {
    expect(validate('```json\n' + JSON.stringify(value) + '\n```')).toEqual(value);
  });

  it('tolerates a bare ``` fenced block', () => {
    expect(validate('```\n' + JSON.stringify(value) + '\n```')).toEqual(value);
  });

  it('slices surrounding prose to the outermost object braces', () => {
    const raw = `Sure! Here is the result: ${JSON.stringify(value)} — hope that helps.`;
    expect(validate(raw)).toEqual(value);
  });

  it('does not corrupt a plain object string (open/close brace branch)', () => {
    expect(validate('{"stage":"lost","confidence":0}')).toEqual({ stage: 'lost', confidence: 0 });
  });

  it('throws a JSON error when no valid object can be parsed', () => {
    // No braces → the slice branch is skipped and JSON.parse fails on the bare token.
    expect(() => validate('not json at all')).toThrow(/not valid JSON/);
  });

  it('throws a JSON error on malformed braces', () => {
    expect(() => validate('{ this is not: json }')).toThrow(/not valid JSON/);
  });

  it('throws via zod when the parsed object fails schema validation (bad enum)', () => {
    expect(() => validate(JSON.stringify({ stage: 'pending', confidence: 0.5 }))).toThrow();
  });

  it('throws via zod when a numeric bound is violated', () => {
    expect(() => validate(JSON.stringify({ stage: 'won', confidence: 2 }))).toThrow();
  });

  it('throws via zod when a required field is missing', () => {
    expect(() => validate(JSON.stringify({ stage: 'won' }))).toThrow();
  });

  it('returns the schema-coerced/typed value (parse output identity)', () => {
    const onlyNumber = makeJsonValidator(z.object({ n: z.number() }));
    expect(onlyNumber('{"n": 42}')).toEqual({ n: 42 });
  });
});
