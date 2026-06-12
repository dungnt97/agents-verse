'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { setCookie } from '@/lib/cookies';

export type Theme = 'light' | 'dark';

type ThemeContextValue = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', next);
      setCookie('av-theme', next);
      try {
        localStorage.setItem('av-theme', next);
      } catch {
        /* localStorage unavailable — cookie carries the value */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// Mirrors the original useTheme() return shape: [theme, toggle].
export function useTheme(): [Theme, () => void] {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return [ctx.theme, ctx.toggle];
}
