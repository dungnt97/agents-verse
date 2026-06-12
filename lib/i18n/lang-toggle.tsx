'use client';

import { useI18n } from './i18n-provider';

// EN / VI segmented toggle. Markup preserved verbatim from the original prototype;
// only the global window.__lang plumbing is swapped for the i18n context.
export function LangToggle() {
  const { lang, setLang } = useI18n();
  const cur = lang;
  return (
    <div className="row" style={{ gap: 2, padding: 3, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {([['en', 'EN'], ['vi', 'VI']] as const).map(([k, lbl]) => (
        <button key={k} onClick={() => setLang(k)} className="focusable" style={{
          height: 26, padding: '0 9px', borderRadius: 6, fontSize: 12, fontWeight: 600, letterSpacing: '.02em',
          background: cur === k ? 'var(--primary)' : 'transparent', color: cur === k ? '#fff' : 'var(--ink-3)', transition: '.15s',
        }}>{lbl}</button>
      ))}
    </div>
  );
}
