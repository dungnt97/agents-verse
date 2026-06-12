'use client';

import { type ReactNode } from 'react';
import { ThemeProvider, type Theme } from '@/lib/providers/theme-provider';
import { I18nProvider, type Lang } from '@/lib/i18n';
import { ToastProvider } from '@/lib/providers/toast-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';

// Client provider stack seeded from server-read cookie values so client hydration matches
// the server-rendered theme/language/auth state exactly.
// Stack order: Theme > I18n > Auth > Toast > children.
export function Providers({
  theme,
  lang,
  initialAuthed,
  initialUser,
  children,
}: {
  theme: Theme;
  lang: Lang;
  initialAuthed: boolean;
  initialUser: string;
  children: ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={theme}>
      <I18nProvider initialLang={lang}>
        <AuthProvider initialAuthed={initialAuthed} initialUser={initialUser}>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
