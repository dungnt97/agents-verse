'use client';

import { type ReactNode } from 'react';
import { ThemeProvider, type Theme } from '@/lib/providers/theme-provider';
import { I18nProvider, type Lang } from '@/lib/i18n';
import { ToastProvider } from '@/lib/providers/toast-provider';
import { AuthProvider } from '@/lib/providers/auth-provider';
import { WorkspaceStateProvider } from '@/lib/providers/workspace-state-provider';
import type { Lead, DemoRequest } from '@/lib/data/types';

// Client provider stack seeded from server-read cookie values so client hydration matches
// the server-rendered theme/language/auth state exactly.
// Stack order: Theme > I18n > Auth > Toast > children.
export function Providers({
  theme,
  lang,
  initialAuthed,
  initialUser,
  useDb,
  initialLeads,
  initialRequests,
  initialMode,
  children,
}: {
  theme: Theme;
  lang: Lang;
  initialAuthed: boolean;
  initialUser: string;
  useDb: boolean;
  initialLeads: Lead[];
  initialRequests: DemoRequest[];
  initialMode: string;
  children: ReactNode;
}) {
  return (
    <ThemeProvider initialTheme={theme}>
      <I18nProvider initialLang={lang}>
        <AuthProvider initialAuthed={initialAuthed} initialUser={initialUser} useDb={useDb}>
          <WorkspaceStateProvider
            initialLeads={initialLeads}
            initialRequests={initialRequests}
            initialMode={initialMode}
            useDb={useDb}
          >
            <ToastProvider>{children}</ToastProvider>
          </WorkspaceStateProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
