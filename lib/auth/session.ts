import 'server-only';
import { cookies, headers } from 'next/headers';
import { auth } from './server';
import { USE_DB } from '@/lib/repositories/config';

export interface CurrentUser {
  email: string;
}

// Resolves the current user for Server Components / route guards.
// - DB mode: validates a real Better Auth session against Postgres (the true gate).
// - Demo mode (no DB): reads the lightweight av-auth cookie so the prototype login keeps
//   working without a database. NOT a security boundary — there is no real data to protect
//   in demo mode.
// Kept out of lib/auth/server.ts so the seed script (run under tsx) never imports
// next/headers, which only resolves inside the Next runtime.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!USE_DB) {
    const store = await cookies();
    if (store.get('av-auth')?.value !== '1') return null;
    return { email: store.get('av-user')?.value || 'founder@agentsverse.ai' };
  }
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ? { email: session.user.email } : null;
}
