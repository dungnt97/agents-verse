import { auth } from '@/lib/auth/server';
import { toNextJsHandler } from 'better-auth/next-js';

// Better Auth catch-all handler (sign-in/out, session, etc.). Only exercised when
// USE_DB is on; the demo fallback never hits these routes.
export const { GET, POST } = toNextJsHandler(auth);
