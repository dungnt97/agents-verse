/* =========================================================================
   AGENTS VERSE — LoginScreen
   Ports auth.jsx: LoginScreen component.
   theme/onToggle props removed — ThemeToggle and LangToggle are context-
   sourced. Pre-filled demo credentials preserved from the original.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LangToggle, useI18n } from '@/lib/i18n';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void;
  onBack: () => void;
}

export function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState('founder@agentsverse.ai');
  const [pw, setPw] = useState('demo1234');
  const [show, setShow] = useState(false);
  const valid = /.+@.+\..+/.test(email) && pw.length >= 1;
  const submit = () => { if (valid) onLogin(email, pw); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="grain" style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: -160, left: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 65%)', opacity: .7 }} />
      <div className="row" style={{ position: 'absolute', top: 20, right: 22, zIndex: 2, gap: 10 }}>
        <LangToggle /><ThemeToggle />
      </div>
      <div style={{ position: 'relative', zIndex: 1, width: 420, maxWidth: '100%' }}>
        <div className="col center" style={{ marginBottom: 26 }}>
          <button onClick={onBack} className="focusable" style={{ display: 'flex' }}><Logo size={32} /></button>
        </div>
        <div className="card-elev" style={{ padding: 32, boxShadow: 'var(--sh-xl)' }}>
          <h1 style={{ fontSize: 24, letterSpacing: '-0.03em', marginBottom: 6 }}>{t('auth.welcome')}</h1>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', marginBottom: 24 }}>{t('auth.sub')}</p>
          <div className="col" style={{ gap: 14 }}>
            <label style={{ display: 'block' }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{t('auth.email')}</span>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" autoFocus
                style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)', outline: 'none' }} />
            </label>
            <label style={{ display: 'block' }}>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}>{t('auth.password')}</span>
                <button style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{t('auth.forgot')}</button>
              </div>
              <div className="row" style={{ position: 'relative' }}>
                <input value={pw} onChange={e => setPw(e.target.value)} type={show ? 'text' : 'password'} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && submit()}
                  style={{ width: '100%', height: 44, padding: '0 44px 0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)', outline: 'none' }} />
                <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 6, top: 6, width: 32, height: 32, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--ink-3)' }} aria-label="Toggle password"><Icon name={show ? 'audits' : 'globe'} size={16} /></button>
              </div>
            </label>
            <button className="btn btn-primary btn-lg" onClick={submit} disabled={!valid} style={{ width: '100%', marginTop: 4, opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>{t('auth.btn')} <Icon name="arrowR" size={17} /></button>
          </div>
          <div style={{ marginTop: 18, padding: '10px 13px', borderRadius: 10, background: 'var(--surface-muted)', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <Icon name="shield" size={15} style={{ color: 'var(--ink-3)', flex: 'none', marginTop: 1 }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>{t('auth.hint')}</span>
          </div>
        </div>
        <div className="col center" style={{ marginTop: 20 }}>
          <button onClick={onBack} className="row focusable" style={{ gap: 7, fontSize: 13.5, color: 'var(--ink-2)' }}><Icon name="chevR" size={14} style={{ transform: 'rotate(180deg)' }} /> {t('auth.back')}</button>
        </div>
      </div>
    </div>
  );
}
