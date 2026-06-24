import { describe, it, expect } from 'vitest';
import { miraSupport } from '@/lib/agents/defs/mira-support';

// Mira's onboarding email is sent to a paying client, so a malformed model response must be rejected
// (and retried) rather than sent. Pin the validator: clean + fenced JSON parse, junk throws.
describe('miraSupport.validate', () => {
  const valid = { subject: 'Chào mừng — bắt đầu dự án', body: 'Cảm ơn anh/chị...\n\n- Logo\n- Hình ảnh' };

  it('parses clean JSON', () => {
    expect(miraSupport.validate(JSON.stringify(valid))).toEqual(valid);
  });

  it('tolerates a fenced block', () => {
    expect(miraSupport.validate('```json\n' + JSON.stringify(valid) + '\n```')).toEqual(valid);
  });

  it('rejects an empty subject', () => {
    expect(() => miraSupport.validate(JSON.stringify({ subject: '', body: 'x' }))).toThrow();
  });

  it('rejects non-JSON', () => {
    expect(() => miraSupport.validate('sorry, here is your email: ...')).toThrow();
  });
});
