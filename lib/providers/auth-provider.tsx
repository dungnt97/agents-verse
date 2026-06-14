/* =========================================================================
   AGENTS VERSE — AuthProvider + useAuth()
   Seeded from the server (getCurrentUser) via props so SSR HTML matches client
   hydration with no flash. Dual-mode:
     - DB mode (useDb): login/logout go through Better Auth (authClient); the
       session cookie is managed by Better Auth and validated server-side.
     - Demo mode (no DB): login/logout write the lightweight av-auth/av-user
       cookies, preserving the prototype's password-less demo sign-in.
   ========================================================================= */
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { setCookie } from '@/lib/cookies';
import { authClient } from '@/lib/auth/client';

// Remove cookie by setting max-age=0
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

interface AuthContextValue {
  authed: boolean;
  user: string;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  initialAuthed: boolean;
  initialUser: string;
  useDb: boolean;
  children: ReactNode;
}

export function AuthProvider({ initialAuthed, initialUser, useDb, children }: AuthProviderProps) {
  const [authed, setAuthed] = useState<boolean>(initialAuthed);
  const [user, setUser] = useState<string>(initialUser);

  const login = useCallback(
    async (email: string, password?: string) => {
      if (useDb) {
        // Real credential sign-in; Better Auth sets + manages the session cookie.
        const res = await authClient.signIn.email({ email, password: password ?? '' });
        if (res.error) throw new Error(res.error.message || 'Sign-in failed');
      } else {
        // Demo fallback — write cookies so the server reads auth state on next SSR request.
        setCookie('av-auth', '1');
        setCookie('av-user', email);
        try { localStorage.setItem('av-auth', '1'); } catch { /* private mode */ }
        try { localStorage.setItem('av-user', email); } catch { /* private mode */ }
      }
      setUser(email);
      setAuthed(true);
    },
    [useDb],
  );

  const logout = useCallback(async () => {
    if (useDb) {
      await authClient.signOut();
    } else {
      deleteCookie('av-auth');
      deleteCookie('av-user');
      try { localStorage.removeItem('av-auth'); } catch { /* private mode */ }
      try { localStorage.removeItem('av-user'); } catch { /* private mode */ }
    }
    setUser('');
    setAuthed(false);
  }, [useDb]);

  return (
    <AuthContext.Provider value={{ authed, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
