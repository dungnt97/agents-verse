import '../styles/globals.css';
import { cookies } from 'next/headers';
import { type ReactNode } from 'react';
import type { Metadata } from 'next';
import { Providers } from './providers';
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
  const initialAuthed = store.get('av-auth')?.value === '1';
  const initialUser = store.get('av-user')?.value ?? '';

  return (
    <html lang={lang} data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Load the design-system webfonts (Hanken Grotesk + JetBrains Mono) exactly as the
            original index.html does. Next/Turbopack does NOT honor the remote @import in
            globals.css, so without this explicit link the app silently falls back to system-ui
            and the typography no longer matches the original. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:ital,wght@0,300..800;1,400..600&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Providers theme={theme} lang={lang} initialAuthed={initialAuthed} initialUser={initialUser}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
