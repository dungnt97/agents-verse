import './globals.css';
import { cookies } from 'next/headers';
import { type ReactNode } from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { getCurrentUser } from '@/lib/auth/session';
import { USE_DB } from '@/lib/repositories/config';
import { getLeads } from '@/lib/repositories/leads';
import { getDemoRequests, getSettings } from '@/lib/repositories/ops';
import type { Theme } from '@/lib/providers/theme-provider';
import type { Lang } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Agents Verse — Autonomous demo-first web agency',
  description:
    'Agents Verse finds outdated business websites, builds a working redesign demo, and prepares the outreach — before a human ever needs to step in.',
};

// Root layout reads theme/lang/auth from cookies on the server and seeds client providers,
// so the first painted HTML already has the correct theme, language, and auth state —
// no flash, no hydration mismatch.
export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const theme: Theme = store.get('av-theme')?.value === 'dark' ? 'dark' : 'light';
  const lang: Lang = store.get('av-lang')?.value === 'vi' ? 'vi' : 'en';
  // Seed auth + mutable workspace state from the server (repositories return the mock in
  // demo mode and Postgres in DB mode), so the first paint matches client hydration.
  const [currentUser, initialLeads, initialRequests, settingsRow] = await Promise.all([
    getCurrentUser(),
    getLeads(),
    getDemoRequests(),
    getSettings(),
  ]);
  const initialAuthed = currentUser !== null;
  const initialUser = currentUser?.email ?? '';
  const initialMode = settingsRow?.autonomyMode ?? 'guarded';

  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Load the design-system webfonts (Hanken Grotesk + JetBrains Mono) via an explicit
            <link>. Next/Turbopack does NOT honor the remote @import in globals.css, so without
            this the app silently falls back to system-ui and the typography breaks. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..800;1,400..600&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Providers
          theme={theme}
          lang={lang}
          initialAuthed={initialAuthed}
          initialUser={initialUser}
          useDb={USE_DB}
          initialLeads={initialLeads}
          initialRequests={initialRequests}
          initialMode={initialMode}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
