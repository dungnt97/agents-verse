/* =========================================================================
   AGENTS VERSE — Info page section components
   AboutPage, CareersPage, ContactPage, ContactForm,
   CasesPage, GuaranteesPage, StatusPage, and the three legal bodies
   (privacy / terms / security via LegalDoc + LEGAL constant).
   All JSX markup, inline styles, class names, and numeric constants are
   preserved byte-for-byte from the source prototype.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { wrap } from '@/components/landing/layout-constants';
import { Icon } from '@/components/brand/icon';
import { Reveal } from '@/components/ui/reveal';
import { SiteMock } from '@/components/site-mock';
import { useLandingInfoT } from '@/lib/i18n/keys/landing-info';
/* ---- Shared helpers ---- */

interface InfoHeroProps {
  eyebrow: string;
  title: string;
  sub?: string;
  max?: number;
}

function InfoHero({ eyebrow, title, sub, max = 720 }: InfoHeroProps) {
  return (
    <div style={{ ...wrap, paddingTop: 80, paddingBottom: 24 }}>
      <Reveal><div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 16 }}>{eyebrow}</div></Reveal>
      <Reveal delay={60}><h1 style={{ fontSize: 'clamp(34px,5vw,60px)', letterSpacing: '-0.04em', lineHeight: 1.04, maxWidth: max }}>{title}</h1></Reveal>
      {sub && <Reveal delay={120}><p style={{ fontSize: 19, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 20, maxWidth: 600, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{sub}</p></Reveal>}
    </div>
  );
}

interface InfoCTAProps {
  onRequestDemo: () => void;
}

function InfoCTA({ onRequestDemo }: InfoCTAProps) {
  const { t } = useLandingInfoT();
  return (
    <div style={{ ...wrap, paddingTop: 60, paddingBottom: 100 }}>
      <Reveal>
        <div className="row between wrap" style={{ gap: 20, padding: '40px 44px', borderRadius: 24, background: 'radial-gradient(130% 160% at 0% 0%, var(--primary-soft), var(--surface))', border: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 28, letterSpacing: '-0.03em', marginBottom: 8 }}>{t('info.ctaTitle')}</h2>
            <p style={{ fontSize: 16, color: 'var(--ink-2)' }}>{t('info.ctaSub')}</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onRequestDemo}>{t('info.ctaBtn')} <Icon name="arrowR" size={18} /></button>
        </div>
      </Reveal>
    </div>
  );
}

/* ---- ABOUT ---- */

export interface AboutPageProps {
  onRequestDemo: () => void;
}

export function AboutPage({ onRequestDemo }: AboutPageProps) {
  const { t } = useLandingInfoT();
  const values = [
    { t: t('info.about.v1t'), d: t('info.about.v1d') },
    { t: t('info.about.v2t'), d: t('info.about.v2d') },
    { t: t('info.about.v3t'), d: t('info.about.v3d') },
    { t: t('info.about.v4t'), d: t('info.about.v4d') },
  ];
  return (
    <>
      <InfoHero eyebrow={t('info.about.eyebrow')} title={t('info.about.title')} sub={t('info.about.sub')} />
      <div style={{ ...wrap, paddingTop: 40, paddingBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: 56 }} className="why-grid">
          <Reveal><h2 style={{ fontSize: 'clamp(26px,3vw,36px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{t('info.about.midTitle')}</h2></Reveal>
          <div className="col" style={{ gap: 18 }}>
            <Reveal delay={80}><p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{t('info.about.p1')}</p></Reveal>
            <Reveal delay={140}><p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{t('info.about.p2')}</p></Reveal>
            <Reveal delay={200}><p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{t('info.about.p3')}</p></Reveal>
          </div>
        </div>
      </div>
      <div style={{ ...wrap, paddingTop: 50 }}>
        <div className="eyebrow" style={{ marginBottom: 22 }}>{t('info.about.beliefsEyebrow')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {values.map((v, i) => (<Reveal key={i} delay={i * 70}><div className="card" style={{ padding: 22, height: '100%' }}><div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>{v.t}</div><p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{v.d}</p></div></Reveal>))}
        </div>
      </div>
      <InfoCTA onRequestDemo={onRequestDemo} />
    </>
  );
}

/* ---- CAREERS ---- */

export interface CareersPageProps {
  onRequestDemo: () => void;
}

export function CareersPage({ onRequestDemo }: CareersPageProps) {
  const { t } = useLandingInfoT();
  const roles = [
    { t: t('info.careers.r1t'), team: t('info.careers.r1team'), loc: t('info.careers.rLoc'),  d: t('info.careers.r1d') },
    { t: t('info.careers.r2t'), team: t('info.careers.r2team'), loc: t('info.careers.rLoc'),  d: t('info.careers.r2d') },
    { t: t('info.careers.r3t'), team: t('info.careers.r3team'), loc: t('info.careers.rLoc'),  d: t('info.careers.r3d') },
    { t: t('info.careers.r4t'), team: t('info.careers.r4team'), loc: t('info.careers.r4loc'), d: t('info.careers.r4d') },
  ];
  const perks = [
    t('info.careers.perk1'), t('info.careers.perk2'), t('info.careers.perk3'),
    t('info.careers.perk4'), t('info.careers.perk5'), t('info.careers.perk6'),
  ];
  return (
    <>
      <InfoHero eyebrow={t('info.careers.eyebrow')} title={t('info.careers.title')} sub={t('info.careers.sub')} />
      <div style={{ ...wrap, paddingTop: 30 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>{t('info.careers.rolesEyebrow')}</div>
        <div className="col" style={{ gap: 12 }}>
          {roles.map((r, i) => (<Reveal key={i} delay={i * 60}>
            <div className="card row between" style={{ padding: '20px 22px', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <div className="row" style={{ gap: 10, marginBottom: 6 }}><span style={{ fontSize: 17, fontWeight: 600 }}>{r.t}</span><span className="badge badge-neutral">{r.team}</span></div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>{r.d}</p>
              </div>
              <div className="row" style={{ gap: 16 }}>
                <span className="row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="pin" size={14} /> {r.loc}</span>
                <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={onRequestDemo}>{t('info.careers.applyBtn')} <Icon name="arrowUR" size={14} /></button>
              </div>
            </div>
          </Reveal>))}
        </div>
      </div>
      <div style={{ ...wrap, paddingTop: 50 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>{t('info.careers.perksEyebrow')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          {perks.map((p, i) => (<Reveal key={i} delay={i * 50}><div className="row" style={{ gap: 11, padding: '16px 18px', borderRadius: 13, background: 'var(--surface-muted)' }}><Icon name="check" size={17} sw={2.2} style={{ color: 'var(--primary)', flex: 'none' }} /><span style={{ fontSize: 14.5, fontWeight: 500 }}>{p}</span></div></Reveal>))}
        </div>
      </div>
      <InfoCTA onRequestDemo={onRequestDemo} />
    </>
  );
}

/* ---- CONTACT ---- */

export interface ContactFormProps {
  onRequestDemo: () => void;
}

export function ContactForm({ onRequestDemo: _onRequestDemo }: ContactFormProps) {
  const { t } = useLandingInfoT();
  const [f, setF] = useState({ name: '', email: '', business: '', package: 'Business Website', message: '' });
  const [sent, setSent] = useState(false);
  const valid = f.name.trim() && /.+@.+\..+/.test(f.email) && f.business.trim();
  const fld = (label: string, key: keyof typeof f, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{label}</span>
      <input value={f[key]} onChange={e => setF(s => ({ ...s, [key]: e.target.value }))} {...props}
        style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)', outline: 'none' }} />
    </label>
  );
  if (sent) return (
    <div className="card-elev" style={{ padding: '48px 36px', textAlign: 'center', boxShadow: 'var(--sh-lg)' }}>
      <div style={{ width: 62, height: 62, borderRadius: 18, margin: '0 auto 22px', display: 'grid', placeItems: 'center', background: 'var(--success-soft)', color: 'var(--success)' }}><Icon name="check" size={30} sw={2.4} /></div>
      <h3 style={{ fontSize: 23, letterSpacing: '-0.02em', marginBottom: 12 }}>{t('info.contact.sentTitle')}</h3>
      <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 340, margin: '0 auto 24px' }}>{t('info.contact.sentSub1')} {f.name.split(' ')[0]} {t('info.contact.sentSub2')} {f.email} {t('info.contact.sentSub3')} {f.business}{t('info.contact.sentSub4')}</p>
      <button className="btn btn-soft" onClick={() => { setSent(false); setF({ name: '', email: '', business: '', package: 'Business Website', message: '' }); }}>{t('info.contact.sentAnother')}</button>
    </div>
  );
  return (
    <div className="card-elev" style={{ padding: 30, boxShadow: 'var(--sh-lg)' }}>
      <h3 style={{ fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>{t('info.contact.formTitle')}</h3>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 22 }}>{t('info.contact.formSub')}</p>
      <div className="col" style={{ gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {fld(t('info.contact.labelName'), 'name', { placeholder: t('info.contact.placeholderName') })}
          {fld(t('info.contact.labelEmail'), 'email', { placeholder: t('info.contact.placeholderEmail'), type: 'email' })}
        </div>
        {fld(t('info.contact.labelBusiness'), 'business', { placeholder: t('info.contact.placeholderBusiness') })}
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{t('info.contact.labelNeed')}</span>
          <select value={f.package} onChange={e => setF(s => ({ ...s, package: e.target.value }))} style={{ width: '100%', height: 44, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)' }}>
            {[
              t('info.contact.optLanding'),
              t('info.contact.optBusiness'),
              t('info.contact.optCare'),
              t('info.contact.optCustom'),
              t('info.contact.optUnsure'),
            ].map(o => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>{t('info.contact.labelMessage')}</span>
          <textarea value={f.message} onChange={e => setF(s => ({ ...s, message: e.target.value }))} rows={4} placeholder={t('info.contact.placeholderMessage')}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
        </label>
        <button className="btn btn-primary btn-lg" disabled={!valid} onClick={() => setSent(true)} style={{ width: '100%', opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>{t('info.contact.submitBtn')} <Icon name="arrowR" size={17} /></button>
        <p className="row" style={{ gap: 7, justifyContent: 'center', fontSize: 12, color: 'var(--ink-3)' }}><Icon name="shield" size={13} /> {t('info.contact.privacy')}</p>
      </div>
    </div>
  );
}

export interface ContactPageProps {
  onRequestDemo: () => void;
}

export function ContactPage({ onRequestDemo }: ContactPageProps) {
  const { t } = useLandingInfoT();
  const methods = [
    { ic: 'chat',   t: t('info.contact.m1t'), v: 'hello@agentsverse.ai' },
    { ic: 'deals',  t: t('info.contact.m2t'), v: 'partners@agentsverse.ai' },
    { ic: 'shield', t: t('info.contact.m3t'), v: 'security@agentsverse.ai' },
  ];
  const steps = [
    { t: t('info.contact.s1t'), d: t('info.contact.s1d') },
    { t: t('info.contact.s2t'), d: t('info.contact.s2d') },
    { t: t('info.contact.s3t'), d: t('info.contact.s3d') },
    { t: t('info.contact.s4t'), d: t('info.contact.s4d') },
  ];
  return (
    <>
      <InfoHero eyebrow={t('info.contact.eyebrow')} title={t('info.contact.title')} sub={t('info.contact.sub')} max={640} />
      <div style={{ ...wrap, paddingTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.05fr)', gap: 48, alignItems: 'start' }} className="why-grid">
          {/* left: info */}
          <div>
            <Reveal>
              <div className="col" style={{ gap: 10, marginBottom: 30 }}>
                {methods.map((m, i) => (
                  <div key={i} className="row between" style={{ padding: '15px 17px', borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <span className="row" style={{ gap: 13 }}>
                      <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={m.ic} size={18} /></span>
                      <span><div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.t}</div><div className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{m.v}</div></span>
                    </span>
                    <Icon name="arrowUR" size={16} style={{ color: 'var(--ink-3)' }} />
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>{t('info.contact.nextEyebrow')}</div>
              <div className="col">
                {steps.map((s, i) => (
                  <div key={i} className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                    <div className="col center" style={{ flex: 'none', alignSelf: 'stretch' }}>
                      <span style={{ width: 28, height: 28, borderRadius: 99, background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 600, display: 'grid', placeItems: 'center', flex: 'none' }}>{i + 1}</span>
                      {i < steps.length - 1 && <span style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 18 }} />}
                    </div>
                    <div style={{ paddingBottom: i < steps.length - 1 ? 18 : 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{s.t}</div>
                      <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row wrap" style={{ gap: 22, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <span className="row" style={{ gap: 9, fontSize: 13.5, color: 'var(--ink-2)' }}><Icon name="pin" size={15} style={{ color: 'var(--ink-3)' }} /> {t('info.contact.officeNote')}</span>
                <span className="row" style={{ gap: 9, fontSize: 13.5, color: 'var(--ink-2)' }}><Icon name="clock" size={15} style={{ color: 'var(--ink-3)' }} /> {t('info.contact.replyNote')}</span>
              </div>
            </Reveal>
          </div>
          {/* right: form */}
          <Reveal delay={80}><ContactForm onRequestDemo={onRequestDemo} /></Reveal>
        </div>
      </div>
      <InfoCTA onRequestDemo={onRequestDemo} />
    </>
  );
}

/* ---- CASE STUDIES ---- */

export interface CasesPageProps {
  onRequestDemo: () => void;
}

export function CasesPage({ onRequestDemo }: CasesPageProps) {
  const { t } = useLandingInfoT();
  // No published case studies yet — fabricated examples removed (no real source).
  const cases: { co: string; ind: string; hue: number; result: string; quote: string }[] = [];
  return (
    <>
      <InfoHero eyebrow={t('info.cases.eyebrow')} title={t('info.cases.title')} sub={t('info.cases.sub')} />
      <div style={{ ...wrap, paddingTop: 20 }}>
        <div className="col" style={{ gap: 24 }}>
          {cases.map((c, i) => (<Reveal key={i} delay={i * 80}>
            {/* Original markup carried a duplicate className where "showcase-grid" overrode
                "card-elev" (last-wins), so the card-elev surface never rendered. Reproduced
                here as showcase-grid only to keep the page pixel-identical to the original. */}
            <div className="showcase-grid" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 26, alignItems: 'center', boxShadow: 'var(--sh-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div className="row between" style={{ marginBottom: 8 }}><span className="eyebrow" style={{ color: 'var(--ink-3)' }}>{t('info.cases.before')}</span></div><SiteMock variant="old" hue={c.hue} chrome={false} ratio="66%" /></div>
                <div><div className="row between" style={{ marginBottom: 8 }}><span className="eyebrow" style={{ color: 'var(--primary)' }}>{t('info.cases.after')}</span></div><SiteMock variant="new" hue={c.hue} chrome={false} ratio="66%" /></div>
              </div>
              <div>
                <h3 style={{ fontSize: 22, marginBottom: 4 }}>{c.co}</h3>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>{c.ind}</div>
                <div className="row" style={{ gap: 8, marginBottom: 16, fontSize: 14.5, color: 'var(--ink)', fontWeight: 600 }}><Icon name="arrowUR" size={16} style={{ color: 'var(--success)' }} /> {c.result}</div>
                <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic', textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>"{c.quote}"</p>
              </div>
            </div>
          </Reveal>))}
        </div>
      </div>
      <InfoCTA onRequestDemo={onRequestDemo} />
    </>
  );
}

/* ---- GUARANTEES ---- */

export interface GuaranteesPageProps {
  onRequestDemo: () => void;
}

export function GuaranteesPage({ onRequestDemo }: GuaranteesPageProps) {
  const { t } = useLandingInfoT();
  const gs = [
    { ic: 'layers', t: t('info.guar.g1t'), d: t('info.guar.g1d') },
    { ic: 'dollar', t: t('info.guar.g2t'), d: t('info.guar.g2d') },
    { ic: 'user',   t: t('info.guar.g3t'), d: t('info.guar.g3d') },
    { ic: 'shield', t: t('info.guar.g4t'), d: t('info.guar.g4d') },
    { ic: 'clock',  t: t('info.guar.g5t'), d: t('info.guar.g5d') },
    { ic: 'check',  t: t('info.guar.g6t'), d: t('info.guar.g6d') },
  ];
  return (
    <>
      <InfoHero eyebrow={t('info.guar.eyebrow')} title={t('info.guar.title')} sub={t('info.guar.sub')} />
      <div style={{ ...wrap, paddingTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
          {gs.map((g, i) => (<Reveal key={i} delay={i * 60}>
            <div className="card" style={{ padding: 24, height: '100%' }}>
              <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', marginBottom: 16 }}><Icon name={g.ic} size={21} /></span>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>{g.t}</div>
              <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{g.d}</p>
            </div>
          </Reveal>))}
        </div>
      </div>
      <InfoCTA onRequestDemo={onRequestDemo} />
    </>
  );
}

/* ---- STATUS ---- */

export interface StatusPageProps {
  onRequestDemo: () => void;
}

export function StatusPage({ onRequestDemo }: StatusPageProps) {
  const { t } = useLandingInfoT();
  const comps: [string, string][] = [
    [t('info.status.comp1'), t('info.status.compStatus')],
    [t('info.status.comp2'), t('info.status.compStatus')],
    [t('info.status.comp3'), t('info.status.compStatus')],
    [t('info.status.comp4'), t('info.status.compStatus')],
    [t('info.status.comp5'), t('info.status.compStatus')],
    [t('info.status.comp6'), t('info.status.compStatus')],
  ];
  return (
    <>
      <InfoHero eyebrow={t('info.status.eyebrow')} title={t('info.status.title')} sub={t('info.status.sub')} max={620} />
      <div style={{ ...wrap, paddingTop: 20 }}>
        <Reveal>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div className="row between" style={{ padding: '18px 22px', background: 'var(--success-soft)', borderBottom: '1px solid var(--border)' }}>
              <span className="row" style={{ gap: 11, fontSize: 16, fontWeight: 600, color: 'var(--success)' }}><span className="pulse" style={{ background: 'var(--success)' }} /> {t('info.status.allOp')}</span>
            </div>
            <div style={{ padding: '6px 22px' }}>
              {comps.map(([n, s], i) => (<div key={i} className="row between" style={{ padding: '14px 0', borderBottom: i < comps.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                <span style={{ fontSize: 14.5 }}>{n}</span>
                <span className="row" style={{ gap: 8, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--success)' }} />{s}</span>
              </div>))}
            </div>
          </div>
        </Reveal>
      </div>
      <InfoCTA onRequestDemo={onRequestDemo} />
    </>
  );
}

/* ---- LEGAL ---- */

interface LegalSection {
  h: string;
  body: string;
}

interface LegalDocProps {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

function LegalDoc({ title, updated, intro, sections }: LegalDocProps) {
  const { t } = useLandingInfoT();
  return (
    <>
      <InfoHero eyebrow={t('info.legal.eyebrow')} title={title} sub={intro} max={680} />
      <div style={{ ...wrap, paddingTop: 10, paddingBottom: 90 }}>
        <div style={{ maxWidth: 760 }}>
          <Reveal><div className="row" style={{ gap: 8, marginBottom: 30, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="clock" size={14} /> {t('info.legal.lastUpdated')} {updated}</div></Reveal>
          {sections.map((s, i) => (<Reveal key={i} delay={Math.min(i * 40, 200)}>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 19, marginBottom: 10, letterSpacing: '-0.02em' }}>{i + 1}. {s.h}</h3>
              <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.65, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{s.body}</p>
            </div>
          </Reveal>))}
          <Reveal><p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 10, paddingTop: 20, borderTop: '1px solid var(--border)' }}>{t('info.legal.footer')} <span style={{ color: 'var(--primary)', fontWeight: 600 }}>legal@agentsverse.ai</span>. {t('info.legal.footerNote')}</p></Reveal>
        </div>
      </div>
    </>
  );
}

/** Renders the legal body for the given slug (privacy | terms | security). Returns null for unknown slugs. */
export function LegalBody({ slug }: { slug: string }) {
  const { t } = useLandingInfoT();

  type LegalKey = 'privacy' | 'terms' | 'security';

  const LEGAL: Record<LegalKey, LegalDocProps> = {
    privacy: {
      title: t('info.privacy.title'),
      updated: t('info.privacy.updated'),
      intro: t('info.privacy.intro'),
      sections: [
        { h: t('info.privacy.s1h'), body: t('info.privacy.s1b') },
        { h: t('info.privacy.s2h'), body: t('info.privacy.s2b') },
        { h: t('info.privacy.s3h'), body: t('info.privacy.s3b') },
        { h: t('info.privacy.s4h'), body: t('info.privacy.s4b') },
        { h: t('info.privacy.s5h'), body: t('info.privacy.s5b') },
        { h: t('info.privacy.s6h'), body: t('info.privacy.s6b') },
      ],
    },
    terms: {
      title: t('info.terms.title'),
      updated: t('info.terms.updated'),
      intro: t('info.terms.intro'),
      sections: [
        { h: t('info.terms.s1h'), body: t('info.terms.s1b') },
        { h: t('info.terms.s2h'), body: t('info.terms.s2b') },
        { h: t('info.terms.s3h'), body: t('info.terms.s3b') },
        { h: t('info.terms.s4h'), body: t('info.terms.s4b') },
        { h: t('info.terms.s5h'), body: t('info.terms.s5b') },
        { h: t('info.terms.s6h'), body: t('info.terms.s6b') },
      ],
    },
    security: {
      title: t('info.security.title'),
      updated: t('info.security.updated'),
      intro: t('info.security.intro'),
      sections: [
        { h: t('info.security.s1h'), body: t('info.security.s1b') },
        { h: t('info.security.s2h'), body: t('info.security.s2b') },
        { h: t('info.security.s3h'), body: t('info.security.s3b') },
        { h: t('info.security.s4h'), body: t('info.security.s4b') },
        { h: t('info.security.s5h'), body: t('info.security.s5b') },
        { h: t('info.security.s6h'), body: t('info.security.s6b') },
      ],
    },
  };

  const data = LEGAL[slug as LegalKey];
  if (!data) return null;
  return <LegalDoc {...data} />;
}
