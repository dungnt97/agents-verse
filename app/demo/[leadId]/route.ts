import { getGeneratedDemo } from '@/lib/repositories/generated-demos';
import { getBuild } from '@/lib/repositories/builds';

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
  // the new version lands, so "Improve with AI" never makes a live demo go dark.
  if (demo.html) return demoResponse(demo.html);
  if (demo.status === 'generating') return placeholder('Đang tạo demo…', 'AI đang dựng bản redesign — tải lại trang sau ít phút.');
  return placeholder('Tạo demo thất bại', demo.error ?? 'Vui lòng thử tạo lại.', 500);
}
