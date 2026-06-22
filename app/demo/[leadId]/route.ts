import { getGeneratedDemo } from '@/lib/repositories/generated-demos';

// Serves the AI-generated redesign demo for a lead as a standalone HTML page (this is the URL the
// "View demo" button opens and that a prospect would be sent). Public on purpose — a demo is meant
// to be shareable. Outside DB mode (or before generation) it returns a small status placeholder.
export const dynamic = 'force-dynamic';

function placeholder(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#0b1220;color:#e6edf6;text-align:center;padding:24px}
.card{max-width:440px}h1{font-size:1.4rem;margin:0 0 .5rem}p{color:#9fb0c3;line-height:1.6}
</style></head><body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;
  return new Response(html, { status, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ leadId: string }> }): Promise<Response> {
  const { leadId } = await params;
  const demo = await getGeneratedDemo(leadId);

  if (!demo) return placeholder('Chưa có demo', 'Demo cho lead này chưa được tạo. Bấm “Generate demo” trong workspace.', 404);
  if (demo.status === 'generating') return placeholder('Đang tạo demo…', 'AI đang dựng bản redesign — tải lại trang sau ít phút.');
  if (demo.status === 'failed' || !demo.html) return placeholder('Tạo demo thất bại', demo.error ?? 'Vui lòng thử tạo lại.', 500);

  return new Response(demo.html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
