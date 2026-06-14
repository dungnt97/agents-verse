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
  },
});

export type Auth = typeof auth;
