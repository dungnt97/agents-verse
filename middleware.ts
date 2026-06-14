/* =========================================================================
   AGENTS VERSE — Auth-gate middleware
   Cheap cookie-existence check on the Edge (no DB/TCP available here): redirects
   to /login when neither a Better Auth session cookie (DB mode) nor the demo
   av-auth cookie (no-DB mode) is present. This is an early bounce only — the real
   auth gate is getCurrentUser() in the workspace Server Component layout, which
   validates the session against the database.
   ========================================================================= */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const demoAuthed = req.cookies.get('av-auth')?.value === '1';
  const realSession = Boolean(
    req.cookies.get('better-auth.session_token')?.value ||
      req.cookies.get('__Secure-better-auth.session_token')?.value,
  );
  if (!demoAuthed && !realSession) {
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
