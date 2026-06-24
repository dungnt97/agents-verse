import { describe, it, expect } from 'vitest';

import { makeJsonValidator } from '@/lib/agents/validators';
import { closerSales, closerOutputSchema, type CloserOutput } from '@/lib/agents/defs/closer-sales';

// The Closer's output validator is a load-bearing safety layer: it parses the model's JSON and rejects
// anything that isn't a well-formed recommendation with a REAL DealStage — so a model mis-step can never
// be acted on by handle-reply (an invalid stage throws → runAgent retries, it never advances a deal).

const valid: CloserOutput = {
  kind: 'price-question',
  interpretation: 'Client is warm and asking for the price.',
  suggested: 'Dạ giá gói này là 25 triệu, em gửi báo giá chi tiết nhé.',
  recommendedStage: 'quoted',
  conf: 88,
};

describe('makeJsonValidator + closerOutputSchema', () => {
  const validate = closerSales.validate;

  it('parses a clean JSON object into the typed output', () => {
    expect(validate(JSON.stringify(valid))).toEqual(valid);
  });

  it('strips a ```json fence', () => {
    expect(validate('```json\n' + JSON.stringify(valid) + '\n```')).toEqual(valid);
  });

  it('tolerates leading/trailing prose around the object', () => {
    expect(validate('Here is my analysis:\n' + JSON.stringify(valid) + '\nThanks!')).toEqual(valid);
  });

  it('REJECTS a recommendedStage that is not a real DealStage', () => {
    const bad = JSON.stringify({ ...valid, recommendedStage: 'negotiating' });
    expect(() => validate(bad)).toThrow();
  });

  it('rejects an out-of-range confidence', () => {
    expect(() => validate(JSON.stringify({ ...valid, conf: 130 }))).toThrow();
    expect(() => validate(JSON.stringify({ ...valid, conf: -1 }))).toThrow();
  });

  it('rejects a non-integer confidence', () => {
    expect(() => validate(JSON.stringify({ ...valid, conf: 88.5 }))).toThrow();
  });

  it('rejects missing required fields', () => {
    const { recommendedStage: _omit, ...missing } = valid;
    expect(() => validate(JSON.stringify(missing))).toThrow();
  });

  it('rejects non-JSON garbage', () => {
    expect(() => validate('not json at all')).toThrow();
  });

  it('the exported schema accepts every real DealStage as a recommendation', () => {
    for (const stage of ['pricing', 'created', 'quoted', 'approval', 'call', 'won', 'lost'] as const) {
      expect(() => closerOutputSchema.parse({ ...valid, recommendedStage: stage })).not.toThrow();
    }
  });

  it('makeJsonValidator is reusable for any zod schema (fence + parse + validate)', () => {
    // sanity: the generic helper isn't Closer-specific
    const v = makeJsonValidator(closerOutputSchema);
    expect(v(JSON.stringify(valid)).recommendedStage).toBe('quoted');
  });
});
