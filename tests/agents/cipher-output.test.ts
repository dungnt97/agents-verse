import { describe, it, expect } from 'vitest';
import { cipherCoder, cipherOutputSchema } from '@/lib/agents/defs/cipher-coder';

// Cipher's output is injected into a live <head>, so a malformed model response must be rejected (and
// retried) rather than shipped. These pin the validator: clean JSON parses, a fenced block is tolerated,
// and out-of-bounds / missing fields throw.
describe('cipherCoder.validate', () => {
  const valid = {
    title: 'Atlas Dental — gentle care in Houston',
    description: 'Book a friendly Houston dentist online in seconds — modern, mobile-first, no phone tag.',
    ogTitle: 'Atlas Dental Clinic',
    ogDescription: 'Modern dental care in Houston. Book online in seconds.',
    keywords: ['dentist houston', 'family dentist', 'dental clinic'],
  };

  it('parses clean JSON', () => {
    expect(cipherCoder.validate(JSON.stringify(valid))).toEqual(valid);
  });

  it('tolerates a ```json fenced block', () => {
    expect(cipherCoder.validate('```json\n' + JSON.stringify(valid) + '\n```')).toEqual(valid);
  });

  it('rejects a title over 70 chars', () => {
    const bad = { ...valid, title: 'x'.repeat(71) };
    expect(() => cipherCoder.validate(JSON.stringify(bad))).toThrow();
  });

  it('rejects missing fields', () => {
    expect(() => cipherCoder.validate(JSON.stringify({ title: 'only a title' }))).toThrow();
  });

  it('schema caps keywords at 12', () => {
    const bad = { ...valid, keywords: Array.from({ length: 13 }, (_, i) => `k${i}`) };
    expect(cipherOutputSchema.safeParse(bad).success).toBe(false);
  });
});
