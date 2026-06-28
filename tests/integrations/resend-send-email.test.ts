import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  outreachEmailHtml,
  resendConfigured,
  sendEmail,
  supportEmailHtml,
} from '@/lib/integrations/resend';

// The worker-only Resend sender talks to the REST API over global.fetch and degrades (never throws)
// when the env isn't configured. These tests pin the env per-case via vi.stubEnv and mock global.fetch
// so we can assert the request shape (Authorization, idempotency, conditional List-Unsubscribe) and
// every result branch — plus the two HTML body builders.

// A minimal Response-like stub: only the bits sendEmail reads (ok/status/text/json).
function fakeResponse(opts: { ok: boolean; status?: number; json?: unknown; text?: string }): Response {
  return {
    ok: opts.ok,
    status: opts.status ?? (opts.ok ? 200 : 500),
    json: async () => (opts.json ?? {}),
    text: async () => opts.text ?? '',
  } as unknown as Response;
}

describe('resendConfigured', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is false when neither key is set', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('OUTREACH_FROM', '');
    expect(resendConfigured()).toBe(false);
  });

  it('is false when only RESEND_API_KEY is set', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('OUTREACH_FROM', '');
    expect(resendConfigured()).toBe(false);
  });

  it('is false when only OUTREACH_FROM is set', () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    expect(resendConfigured()).toBe(false);
  });

  it('is true only when both RESEND_API_KEY and OUTREACH_FROM are set', () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    expect(resendConfigured()).toBe(true);
  });
});

describe('sendEmail', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('degrades (no fetch) when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse({ ok: true }));

    const res = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toContain('email not configured');
    expect(res.error).toContain('RESEND_API_KEY');
    expect(res.error).toContain('OUTREACH_FROM');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('degrades (no fetch) when OUTREACH_FROM is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('OUTREACH_FROM', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse({ ok: true }));

    const res = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>hi</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toContain('email not configured');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('includes attachments in the request body when provided', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse({ ok: true, json: { id: 'e1' } }));
    await sendEmail({ to: 'c@x.com', subject: 'Proposal', html: '<p>x</p>', attachments: [{ filename: 'p.pdf', content: 'QkFTRTY0' }] });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { attachments?: unknown };
    expect(body.attachments).toEqual([{ filename: 'p.pdf', content: 'QkFTRTY0' }]);
  });

  it('posts to the Resend endpoint with a Bearer auth header and returns the id on success', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.stubEnv('OUTREACH_REPLY_TO', '');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(fakeResponse({ ok: true, json: { id: 'email_123' } }));

    const res = await sendEmail({ to: 'lead@corp.com', subject: 'Demo', html: '<p>x</p>' });

    expect(res).toEqual({ ok: true, id: 'email_123' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_secret');
    expect(headers['content-type']).toBe('application/json');
    // No idempotency key supplied → header absent.
    expect(headers['Idempotency-Key']).toBeUndefined();

    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.from).toBe('Agents Verse <hello@x.com>');
    expect(body.to).toBe('lead@corp.com');
    expect(body.subject).toBe('Demo');
    expect(body.html).toBe('<p>x</p>');
    // No OUTREACH_REPLY_TO → reply_to falls back to from.
    expect(body.reply_to).toBe('Agents Verse <hello@x.com>');
    // No unsubscribe supplied → no List-Unsubscribe headers in the payload.
    expect(body.headers).toBeUndefined();
  });

  it('uses OUTREACH_REPLY_TO for reply_to when set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.stubEnv('OUTREACH_REPLY_TO', 'Reply <reply@x.com>');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(fakeResponse({ ok: true, json: { id: 'e1' } }));

    await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.reply_to).toBe('Reply <reply@x.com>');
  });

  it('returns ok:true with undefined id when the success body has no id', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse({ ok: true, json: {} }));

    const res = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(true);
    expect(res.id).toBeUndefined();
  });

  it('tolerates a success response whose json() rejects', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json');
      },
      text: async () => '',
    } as unknown as Response);

    const res = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(true);
    expect(res.id).toBeUndefined();
  });

  it('adds the Idempotency-Key header when idempotencyKey is supplied', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(fakeResponse({ ok: true, json: { id: 'e1' } }));

    await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>', idempotencyKey: 'outreach-42' });

    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('outreach-42');
  });

  it('attaches List-Unsubscribe headers only when unsubscribe is present', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(fakeResponse({ ok: true, json: { id: 'e1' } }));

    await sendEmail({
      to: 'a@b.com',
      subject: 'S',
      html: '<p>h</p>',
      unsubscribe: 'mailto:unsub@x.com',
    });

    const init = fetchSpy.mock.calls[0]![1] as RequestInit;
    const body = JSON.parse(init.body as string) as { headers?: Record<string, string> };
    expect(body.headers).toBeDefined();
    expect(body.headers!['List-Unsubscribe']).toBe('<mailto:unsub@x.com>');
    expect(body.headers!['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('returns an error with the status and body excerpt on a non-ok response', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fakeResponse({ ok: false, status: 422, text: 'validation failed: bad to' }),
    );

    const res = await sendEmail({ to: 'bad', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('resend 422: validation failed: bad to');
  });

  it('truncates the error body to 200 chars on a non-ok response', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    const long = 'x'.repeat(500);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fakeResponse({ ok: false, status: 500, text: long }),
    );

    const res = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toBe(`resend 500: ${'x'.repeat(200)}`);
  });

  it('tolerates a non-ok response whose text() rejects (empty body excerpt)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
      text: async () => {
        throw new Error('no body');
      },
    } as unknown as Response);

    const res = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('resend 503: ');
  });

  it('catches a thrown Error from fetch and returns its message', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const res = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('network down');
  });

  it('catches a non-Error throw from fetch and stringifies it', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_secret');
    vi.stubEnv('OUTREACH_FROM', 'Agents Verse <hello@x.com>');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue('boom');

    const res = await sendEmail({ to: 'a@b.com', subject: 'S', html: '<p>h</p>' });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('boom');
  });
});

describe('outreachEmailHtml', () => {
  const demoUrl = 'https://app.test/demo/lumi';
  const unsubscribe = 'mailto:hi@x.com?subject=Unsubscribe';
  const html = outreachEmailHtml('Xin chào team.\n\nĐã dựng lại trang chủ.', demoUrl, unsubscribe);

  it('renders the demo URL as a CTA anchor with the CTA label', () => {
    expect(html).toContain(`<a href="${demoUrl}"`);
    expect(html).toContain('Xem bản demo');
  });

  it('renders a visible unsubscribe footer linking to the unsubscribe target', () => {
    expect(html).toContain(`<a href="${unsubscribe}"`);
    expect(html).toContain('Không muốn nhận email?');
    expect(html).toContain('Huỷ đăng ký');
  });

  it('splits the body into paragraphs on blank lines', () => {
    // two body paragraphs + CTA <p> + footer <p>
    expect((html.match(/<p /g) || []).length).toBe(4);
    expect(html).toContain('Xin chào team.');
    expect(html).toContain('Đã dựng lại trang chủ.');
  });

  it('converts single newlines within a paragraph to <br>', () => {
    const out = outreachEmailHtml('line one\nline two', demoUrl, unsubscribe);
    expect(out).toContain('line one<br>line two');
  });

  it('escapes HTML in the body, the demo URL, and the unsubscribe URL', () => {
    const out = outreachEmailHtml(
      '<script>alert(1)</script> & "quotes"',
      'https://x.test/?a=1&b=2"',
      'mailto:u@x.com?s="x"&y=1',
    );
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('&');
    expect(out).toContain('"');
    // Interpolated URLs are escaped too.
    expect(out).toContain('https://x.test/?a=1&amp;b=2&quot;');
    expect(out).toContain('mailto:u@x.com?s=&quot;x&quot;&amp;y=1');
  });
});

describe('supportEmailHtml', () => {
  it('renders paragraphs but carries no marketing CTA and no unsubscribe footer', () => {
    const html = supportEmailHtml('Cảm ơn bạn.\n\nĐội ngũ sẽ liên hệ.');
    expect((html.match(/<p /g) || []).length).toBe(2);
    expect(html).toContain('Cảm ơn bạn.');
    expect(html).toContain('Đội ngũ sẽ liên hệ.');
    // Transactional: no CTA anchor, no unsubscribe text.
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('Xem bản demo');
    expect(html).not.toContain('Huỷ đăng ký');
  });

  it('converts single newlines to <br> and escapes HTML', () => {
    const html = supportEmailHtml('a < b\nc & d');
    expect(html).toContain('a &lt; b<br>c &amp; d');
  });
});
