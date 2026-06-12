/* =========================================================================
   AGENTS VERSE — AuthProvider + useAuth()
   Seeded from server-read cookies (av-auth, av-user) via props so SSR HTML
   matches client hydration with no flash. login()/logout() write both
   cookies and localStorage for consistent state across tabs/refreshes.
   Cookie keys:  av-auth = '1' | absent    av-user = email | absent
   ========================================================================= */
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { setCookie } from '@/lib/cookies';

// Remove cookie by setting max-age=0
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

interface AuthContextValue {
  authed: boolean;
  user: string;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  initialAuthed: boolean;
  initialUser: string;
  children: ReactNode;
}

export function AuthProvider({ initialAuthed, initialUser, children }: AuthProviderProps) {
  const [authed, setAuthed] = useState<boolean>(initialAuthed);
  const [user, setUser] = useState<string>(initialUser);

  const login = useCallback((email: string) => {
    // Write cookies so server can read auth state on next SSR request
    setCookie('av-auth', '1');
    setCookie('av-user', email);
    // localStorage parity for legacy/offline reads
    try { localStorage.setItem('av-auth', '1'); } catch { /* private mode */ }
    try { localStorage.setItem('av-user', email); } catch { /* private mode */ }
    setUser(email);
    setAuthed(true);
  }, []);

  const logout = useCallback(() => {
    deleteCookie('av-auth');
    deleteCookie('av-user');
    try { localStorage.removeItem('av-auth'); } catch { /* private mode */ }
    try { localStorage.removeItem('av-user'); } catch { /* private mode */ }
    setUser('');
    setAuthed(false);
  }, []);

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
