import { describe, it, expect } from 'vitest';

import { outreachEmailHtml, resendConfigured } from '@/lib/integrations/resend';

// outreachEmailHtml builds the actual email body sent to prospects, so it must always carry the demo
// CTA link and a visible unsubscribe (CAN-SPAM) and must not let interpolated content break the markup.
describe('outreachEmailHtml', () => {
  const html = outreachEmailHtml('Xin chào team.\n\nChúng tôi đã dựng lại trang chủ.', 'https://app.test/demo/lumi', 'mailto:hi@x.com?subject=Unsubscribe');

  it('includes the demo link as a CTA and a visible unsubscribe link', () => {
    expect(html).toContain('https://app.test/demo/lumi');
    expect(html).toContain('mailto:hi@x.com?subject=Unsubscribe');
    expect(html.toLowerCase()).toContain('huỷ đăng ký'.toLowerCase());
  });

  it('renders paragraphs and line breaks from the plain-text body', () => {
    expect((html.match(/<p /g) || []).length).toBeGreaterThanOrEqual(2); // two paragraphs + footer
  });

  it('escapes HTML in the body so injected markup cannot break the email', () => {
    const evil = outreachEmailHtml('<script>alert(1)</script> & "quotes"', 'https://app.test/demo/x', 'mailto:u@x.com');
    expect(evil).not.toContain('<script>');
    expect(evil).toContain('&lt;script&gt;');
    expect(evil).toContain('&amp;');
  });
});

describe('resendConfigured', () => {
  it('reflects whether RESEND_API_KEY + OUTREACH_FROM are set', () => {
    const prevKey = process.env.RESEND_API_KEY;
    const prevFrom = process.env.OUTREACH_FROM;
    try {
      delete process.env.RESEND_API_KEY;
      delete process.env.OUTREACH_FROM;
      expect(resendConfigured()).toBe(false);
      process.env.RESEND_API_KEY = 're_test';
      process.env.OUTREACH_FROM = 'X <x@y.com>';
      expect(resendConfigured()).toBe(true);
    } finally {
      if (prevKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = prevKey;
      if (prevFrom === undefined) delete process.env.OUTREACH_FROM; else process.env.OUTREACH_FROM = prevFrom;
    }
  });
});
