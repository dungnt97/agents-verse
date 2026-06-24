// Worker-only transactional-email sender via the Resend REST API. Called over `fetch` (no SDK
// dependency — keeps the lockfile stable in this environment) and ONLY from the worker (it makes an
// outbound network call). Relative imports + no `server-only` so it's safe under tsx. Echo (outreach)
// and, later, Mira (support) share it.
//
// CAN-SPAM / deliverability: every send carries a real From + Reply-To and a List-Unsubscribe header
// (one-click). Sending requires RESEND_API_KEY + OUTREACH_FROM; without them the caller degrades (the
// worker never throws on a missing key — the web action guards first and returns a toast).
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  // Where a recipient unsubscribes (a mailto or a hosted page). Required (CAN-SPAM) for COMMERCIAL
  // outreach; omitted for TRANSACTIONAL mail to an existing client (e.g. Mira's post-sale onboarding),
  // which is exempt — when absent, no List-Unsubscribe header is sent.
  unsubscribe?: string;
  // Stable key so a worker retry / duplicate trigger can't send the same email twice (Resend dedupes).
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

// True when the gateway is configured to actually send (mirrors the web action's guard).
export function resendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.OUTREACH_FROM;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM; // e.g. "Agents Verse <hello@your-domain.com>"
  const replyTo = process.env.OUTREACH_REPLY_TO || from;
  if (!key || !from) return { ok: false, error: 'email not configured (set RESEND_API_KEY + OUTREACH_FROM)' };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: input.to,
        reply_to: replyTo,
        subject: input.subject,
        html: input.html,
        // CAN-SPAM one-click unsubscribe — only for commercial mail (transactional onboarding omits it).
        ...(input.unsubscribe
          ? {
              headers: {
                'List-Unsubscribe': `<${input.unsubscribe}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `resend ${res.status}: ${body.slice(0, 200)}` };
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: json.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Wrap an agent-written plain-text body into a minimal, deliverable HTML email: the demo link as a
// clear CTA + a visible unsubscribe footer (belt-and-suspenders with the List-Unsubscribe header).
export function outreachEmailHtml(body: string, demoUrl: string, unsubscribe: string): string {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1b2430;max-width:560px">`,
    paragraphs,
    `<p style="margin:24px 0"><a href="${escapeHtml(demoUrl)}" style="display:inline-block;background:#e03c31;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">Xem bản demo</a></p>`,
    `<p style="margin:28px 0 0;font-size:12px;color:#8a8f98">Không muốn nhận email? <a href="${escapeHtml(unsubscribe)}" style="color:#8a8f98">Huỷ đăng ký</a>.</p>`,
    `</div>`,
  ].join('');
}

// Wrap a support/onboarding body (Mira) into a clean transactional HTML email — no marketing CTA, no
// unsubscribe footer (it's transactional mail to a client who just signed).
export function supportEmailHtml(body: string): string {
  const paragraphs = body
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#1b2430;max-width:560px">`,
    paragraphs,
    `</div>`,
  ].join('');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
