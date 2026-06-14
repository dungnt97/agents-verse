'use client';

import { createAuthClient } from 'better-auth/react';

// Browser auth client. baseURL defaults to the current origin, which is correct for the
// same-origin /api/auth/* handler. Used only when USE_DB is on (real auth); the demo
// fallback path never calls it.
export const authClient = createAuthClient();
