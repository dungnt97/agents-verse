'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AV_DICT, type Lang } from './dictionary';
import { setCookie } from '@/lib/cookies';

type I18nContextValue = {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Mirrors the original t(): active-lang value → English fallback → raw key.
  const t = useCallback(
    (key: string): string => (AV_DICT[lang] && AV_DICT[lang][key]) || AV_DICT.en[key] || key,
    [lang],
  );

  const setLang = useCallback((next: Lang) => {
    setCookie('av-lang', next);
    try {
      localStorage.setItem('av-lang', next);
    } catch {
      /* localStorage unavailable (private mode) — cookie is the source of truth anyway */
    }
    setLangState(next);
  }, []);

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
