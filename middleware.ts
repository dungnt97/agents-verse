/* =========================================================================
   AGENTS VERSE — Auth-gate middleware (skeleton)
   Redirects unauthenticated requests to /login when the av-auth cookie is
   absent. The matcher intentionally lists only future workspace routes that
   don't exist yet in Set 1 — so this middleware is inert for marketing.
   Full enforcement activates automatically in Set 2 when those routes land.
   ========================================================================= */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const authed = req.cookies.get('av-auth')?.value === '1';
  if (!authed) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/overview',
    '/command',
    '/rooms/:path*',
    '/agents/:path*',
    '/leads',
    '/audits',
    '/demos',
    '/deals',
    '/settings',
    '/activity',
    '/requests',
  ],
};
