import { getAuditScreenshot } from '@/lib/repositories/leads';
import { getCurrentUser } from '@/lib/auth/session';

// Serves the cached desktop screenshot of a lead's audited site (the real "current website" preview on
// the Audits screen). Auth-gated (internal workspace resource). 404 when no audit screenshot exists yet.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ leadId: string }> }): Promise<Response> {
  if (!(await getCurrentUser())) return new Response('Unauthorized', { status: 401 });
  const { leadId } = await params;
  const png = await getAuditScreenshot(leadId);
  if (!png) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(png, 'base64'), {
    headers: { 'content-type': 'image/png', 'cache-control': 'private, max-age=30' },
  });
}
