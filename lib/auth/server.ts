import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/client';
import { user, session, account, verification } from '../db/schema';

// Server-side Better Auth instance. The Drizzle adapter binds to the existing pooled
// client (lib/db/client.ts). Relative imports (not the `@/` alias) keep this file
// resolvable when run under tsx in the seed script as well as under Next's bundler.
//
// Email verification is disabled — there is no email service yet, so the seeded founder
// must be able to sign in immediately. Real session validation happens in the Node RSC
// layer (getSession); the Edge middleware only does a cheap cookie-existence check.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignInAfterSignUp: false,
    // The catch-all auth route is public; without this, anyone could self-register and every
    // session passes getCurrentUser(), handing a stranger the whole workspace. The only account
    // is the founder, created by the seed via direct DB insert (unaffected by this flag).
    disableSignUp: true,
  },
});

export type Auth = typeof auth;
