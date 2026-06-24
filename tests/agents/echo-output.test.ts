import { describe, it, expect } from 'vitest';

import { echoOutreach, echoOutputSchema } from '@/lib/agents/defs/echo-outreach';

// Echo's validator gates what gets sent as a real email — it must accept a clean {subject, body} and
// reject malformed/over-long output (a 200-char subject line is a spam tell) before anything is sent.
const valid = { subject: 'Bản homepage mới cho Lumi Spa', body: 'Xin chào team Lumi Spa.\n\nChúng tôi đã dựng lại trang chủ.' };

describe('echoOutputSchema (Echo outreach validator)', () => {
  const validate = echoOutreach.validate;

  it('parses a clean {subject, body}', () => {
    expect(validate(JSON.stringify(valid))).toEqual(valid);
  });

  it('strips a ```json fence and tolerates surrounding prose', () => {
    expect(validate('```json\n' + JSON.stringify(valid) + '\n```')).toEqual(valid);
    expect(validate('Sure:\n' + JSON.stringify(valid))).toEqual(valid);
  });

  it('rejects an over-long subject (spam tell) and empty fields', () => {
    expect(() => validate(JSON.stringify({ ...valid, subject: 'x'.repeat(121) }))).toThrow();
    expect(() => validate(JSON.stringify({ ...valid, subject: '' }))).toThrow();
    expect(() => validate(JSON.stringify({ ...valid, body: '' }))).toThrow();
  });

  it('rejects non-JSON output', () => {
    expect(() => validate('just write the email yourself')).toThrow();
  });

  it('schema accepts exactly the DemoOutreach shape', () => {
    expect(echoOutputSchema.parse(valid)).toEqual(valid);
  });
});
