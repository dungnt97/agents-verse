/* =========================================================================
   AGENTS VERSE — InfoPage dispatch + InfoNav
   InfoPage (slug dispatcher) + InfoNav (sticky header).
   theme/onToggle props removed — ThemeToggle and LangToggle are context-
   sourced; no prop threading needed.
   ========================================================================= */
'use client';

import { wrap } from '@/components/landing/layout-constants';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LangToggle, useI18n } from '@/lib/i18n';
import { Footer } from '@/components/landing/sections-2';
import { INFO_PAGES } from '@/lib/info-slugs';
import {
  AboutPage,
  CareersPage,
  ContactPage,
  CasesPage,
  GuaranteesPage,
  StatusPage,
  LegalBody,
} from './info-sections';

// Re-export so callers that only know about this module still get the constant.
export { INFO_PAGES };
export type { InfoSlug } from '@/lib/info-slugs';

/* ---- InfoNav ---- */

interface InfoNavProps {
  onEnter: () => void;
  onRequestDemo: () => void;
  onHome: () => void;
}

export function InfoNav({ onEnter, onRequestDemo, onHome }: InfoNavProps) {
  const { t } = useI18n();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'color-mix(in oklab, var(--bg) 82%, transparent)', backdropFilter: 'saturate(180%) blur(14px)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ ...wrap, height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onHome} className="focusable" style={{ display: 'flex' }}><Logo size={28} /></button>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost hide-mobile focusable" onClick={onHome} style={{ borderColor: 'var(--border)' }}>{t('nav.home')}</button>
          <LangToggle />
          <ThemeToggle />
          <button className="btn btn-ghost hide-mobile" onClick={onEnter} style={{ borderColor: 'var(--border)' }}>{t('nav.openWorkspace')}</button>
          <button className="btn btn-primary" onClick={onRequestDemo}>{t('nav.requestDemo')}</button>
        </div>
      </div>
    </header>
  );
}

/* ---- InfoPage ---- */

interface InfoPageProps {
  page: string;
  onEnter: () => void;
  onRequestDemo: () => void;
  onNav: (route: string) => void;
}

export function InfoPage({ page, onEnter, onRequestDemo, onNav }: InfoPageProps) {
  let body: React.ReactNode;
  if (page === 'about')      body = <AboutPage onRequestDemo={onRequestDemo} />;
  else if (page === 'careers')    body = <CareersPage onRequestDemo={onRequestDemo} />;
  else if (page === 'contact')    body = <ContactPage onRequestDemo={onRequestDemo} />;
  else if (page === 'cases')      body = <CasesPage onRequestDemo={onRequestDemo} />;
  else if (page === 'guarantees') body = <GuaranteesPage onRequestDemo={onRequestDemo} />;
  else if (page === 'status')     body = <StatusPage onRequestDemo={onRequestDemo} />;
  else                            body = <LegalBody slug={page} />;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <InfoNav onEnter={onEnter} onRequestDemo={onRequestDemo} onHome={() => onNav('home')} />
      <main>{body}</main>
      <Footer onEnter={onEnter} onNav={onNav} />
    </div>
  );
}
