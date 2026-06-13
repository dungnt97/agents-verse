'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { AV_DICT, type Lang } from './dictionary';
import { en as shellDashEn, vi as shellDashVi } from './keys/shell-dash';
import { en as roomsAgentsEn, vi as roomsAgentsVi } from './keys/rooms-agents';
import { en as pipelineAuditEn, vi as pipelineAuditVi } from './keys/pipeline-audit';
import { en as demosDealsEn, vi as demosDealsVi } from './keys/demos-deals';
import { en as systemEn, vi as systemVi } from './keys/system';
import { en as landingInfoEn, vi as landingInfoVi } from './keys/landing-info';
import { en as statusEn, vi as statusVi } from './keys/status';
import { setCookie } from '@/lib/cookies';

/* Merged dictionaries: shell-dash keys layered on top of AV_DICT.
   AV_DICT is not modified (dictionary.ts is managed separately). */
const MERGED: Record<Lang, Record<string, string>> = {
  en: { ...AV_DICT.en, ...shellDashEn, ...roomsAgentsEn, ...pipelineAuditEn, ...demosDealsEn, ...systemEn, ...landingInfoEn, ...statusEn },
  vi: { ...AV_DICT.vi, ...shellDashVi, ...roomsAgentsVi, ...pipelineAuditVi, ...demosDealsVi, ...systemVi, ...landingInfoVi, ...statusVi },
};

type I18nContextValue = {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Mirrors the original t(): active-lang value → English fallback → raw key.
  // Resolves against MERGED which includes both AV_DICT and shell-dash keys.
  const t = useCallback(
    (key: string): string => (MERGED[lang] && MERGED[lang][key]) || MERGED.en[key] || key,
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
