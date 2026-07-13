import { getGeneratedDemo } from '@/lib/repositories/generated-demos';
import { getBuild } from '@/lib/repositories/builds';
import { getLeadPublicContext } from '@/lib/repositories/leads';
import { demoLanguageForAddress } from '@/lib/demo-gen/locale';

// Serves the AI-generated redesign demo for a lead as a standalone HTML page (this is the URL the
// "View demo" button opens and that a prospect would be sent). Public on purpose — a demo is meant
// to be shareable. Outside DB mode (or before generation) it returns a small status placeholder.
export const dynamic = 'force-dynamic';

// The demo HTML is LLM-authored and served on the app origin. A strict CSP contains it: the page needs
// its own inline <script>/<style>, Google Fonts and Unsplash images to render — but it has NO reason to
// call back to our origin, submit a form, or reframe the base URI. `connect-src 'none'` + `form-action
// 'none'` neutralise the real risk (a rogue generated script exfiltrating to / POSTing at our server
// actions) while leaving the demo fully functional.
const DEMO_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src https: data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "frame-ancestors 'self'",
].join('; ');

// Append a trusted, CSP-safe "Interested?" button linking to the first-party inquiry page. It is added by
// US (not part of the LLM-authored HTML), so it is guaranteed present and can't be dropped by the model. A
// plain <a> with inline styling only: navigation isn't blocked by the demo's connect-src/form-action CSP, so
// the prospect can leave the sandboxed demo for /inquire without ever running a script or posting a form.
function withInquiryCta(html: string, leadId: string, language: string): string {
  const label = language === 'Vietnamese' ? 'Thích bản này? Nhắn với chúng tôi' : "Like this? Let's talk";
  const cta =
    `<a href="/inquire/${encodeURIComponent(leadId)}" style="position:fixed;right:20px;bottom:20px;` +
    `z-index:2147483647;display:inline-flex;align-items:center;padding:13px 20px;border-radius:999px;` +
    `background:#e85f17;color:#fff;font:600 15px/1 system-ui,-apple-system,sans-serif;text-decoration:none;` +
    `box-shadow:0 8px 24px rgba(232,95,23,.45)">${label}</a>`;
  return html.includes('</body>') ? html.replace('</body>', cta + '</body>') : html + cta;
}

function demoResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': DEMO_CSP,
      'x-content-type-options': 'nosniff',
    },
  });
}

function placeholder(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#0b1220;color:#e6edf6;text-align:center;padding:24px}
.card{max-width:440px}h1{font-size:1.4rem;margin:0 0 .5rem}p{color:#9fb0c3;line-height:1.6}
</style></head><body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;
  return demoResponse(html, status);
}

export async function GET(_req: Request, { params }: { params: Promise<{ leadId: string }> }): Promise<Response> {
  const { leadId } = await params;

  // Prefer the delivery-optimized build (SEO/OG injected for a won deal) over the raw generated demo.
  const build = await getBuild(leadId);
  if (build?.status === 'ready' && build.html) {
    return demoResponse(build.html);
  }

  const demo = await getGeneratedDemo(leadId);

  if (!demo) return placeholder('Chưa có demo', 'Demo cho lead này chưa được tạo. Bấm “Generate demo” trong workspace.', 404);
  // Serve the existing demo even while a re-generation is in flight — the current html stays valid until
  // the new version lands, so "Improve with AI" never makes a live demo go dark. This is the PRE-SALE demo
  // (not a delivered build), so it carries the "Interested?" CTA into the inquiry page, in the lead's language.
  if (demo.html) {
    const lead = await getLeadPublicContext(leadId);
    return demoResponse(withInquiryCta(demo.html, leadId, demoLanguageForAddress(lead?.formattedAddress)));
  }
  if (demo.status === 'generating') return placeholder('Đang tạo demo…', 'AI đang dựng bản redesign — tải lại trang sau ít phút.');
  return placeholder('Tạo demo thất bại', demo.error ?? 'Vui lòng thử tạo lại.', 500);
}
