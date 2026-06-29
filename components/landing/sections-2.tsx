/* =========================================================================
   AGENTS VERSE — Landing sections 7–9 + footer
   Pricing, TrustSafety, FinalCTA, Footer.
   ========================================================================= */
'use client';

import { wrap } from './layout-constants';
import { SectionHead } from './sections-1';
import { Icon } from '@/components/brand/icon';
import { Logo } from '@/components/brand/logo';
import { Mark } from '@/components/brand/mark';
import { Reveal } from '@/components/ui/reveal';
import { DEAL_CONF_FLOOR } from '@/lib/data/deal-stage-machine';
import { DEFAULT_DAILY_CAP } from '@/lib/data/cost-meter';
import { useI18n } from '@/lib/i18n';
import { useLandingInfoT } from '@/lib/i18n/keys/landing-info';

/* ---- S7 · Pricing ---- */
interface PricingProps {
  onRequestDemo: () => void;
}

export function Pricing({ onRequestDemo }: PricingProps) {
  const { t } = useI18n();
  const { t: tli } = useLandingInfoT();
  const plans = [
    { name:t('price.p1'), price:'$900', unit:t('price.p1u'), tag:null, desc:t('price.p1d'),
      feats:[tli('land.p1f1'),tli('land.p1f2'),tli('land.p1f3'),tli('land.p1f4'),tli('land.p1f5'),tli('land.p1f6')] },
    { name:t('price.p2'), price:'$2,400', unit:t('price.p2u'), tag:t('price.most'), desc:t('price.p2d'),
      feats:[tli('land.p2f1'),tli('land.p2f2'),tli('land.p2f3'),tli('land.p2f4'),tli('land.p2f5'),tli('land.p2f6')] },
    { name:t('price.p3'), price:'$240', unit:t('price.p3u'), tag:null, desc:t('price.p3d'),
      feats:[tli('land.p3f1'),tli('land.p3f2'),tli('land.p3f3'),tli('land.p3f4'),tli('land.p3f5'),tli('land.p3f6')] },
  ];
  return (
    <section style={{ ...wrap, padding: '110px 28px' }} id="pricing">
      <SectionHead eyebrow={t('price.eyebrow')} title={t('price.title')} center
        sub={t('price.sub')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, alignItems: 'stretch', maxWidth: 1080, margin: '0 auto' }}>
        {plans.map((p, i) => {
          const hot = !!p.tag;
          return (
            <Reveal key={i} delay={i*100}>
              <div className={hot ? 'card-elev' : 'card'} style={{ padding: 30, height: '100%', display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden', borderColor: hot ? 'var(--primary)' : 'var(--border)',
                boxShadow: hot ? 'var(--sh-xl)' : 'var(--sh-sm)', transform: hot ? 'translateY(-8px)' : 'none' }}>
                {hot && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,var(--primary),var(--info))' }} />}
                <div className="row between" style={{ marginBottom: 18 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  {hot && <span className="badge badge-primary">{p.tag}</span>}
                </div>
                <div className="row" style={{ alignItems: 'baseline', gap: 7, marginBottom: 8 }}>
                  <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.04em' }}>{p.price}</span>
                  <span style={{ fontSize: 13.5, color: 'var(--ink-3)' }}>{p.unit}</span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 22, minHeight: 42, textWrap: 'pretty' }}>{p.desc}</p>
                <button className={'btn ' + (hot ? 'btn-primary' : 'btn-ghost')} style={{ width: '100%', marginBottom: 24 }} onClick={onRequestDemo}>
                  {t('price.cta')}
                </button>
                <div className="col" style={{ gap: 12 }}>
                  {p.feats.map((f, j) => (
                    <div key={j} className="row" style={{ gap: 11, fontSize: 14 }}>
                      <span style={{ color: hot ? 'var(--primary)' : 'var(--success)', flex: 'none', display:'grid', placeItems:'center' }}><Icon name="check" size={16} sw={2.2} /></span>
                      <span style={{ color: 'var(--ink-2)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
      <Reveal><p className="row center" style={{ gap: 8, marginTop: 32, fontSize: 13.5, color: 'var(--ink-3)' }}>
        <Icon name="shield" size={15} /> {t('price.note')}
      </p></Reveal>
    </section>
  );
}

/* ---- S8 · Trust & safety ---- */
export function TrustSafety() {
  const { t } = useI18n();
  const guards = [
    { ic:'send',    t:t('trust.t1'), d:t('trust.d1'), meta:'40 / day max' },
    { ic:'user',    t:t('trust.t2'), d:t('trust.d2'), meta:'Always on' },
    { ic:'shield',  t:t('trust.t3'), d:t('trust.d3'), meta:'Enforced' },
    { ic:'check',   t:t('trust.t4'), d:t('trust.d4'), meta:`${DEAL_CONF_FLOOR}% confidence` },
    { ic:'dollar',  t:t('trust.t5'), d:t('trust.d5'), meta:`$${DEFAULT_DAILY_CAP} / day` },
    { ic:'x',       t:t('trust.t6'), d:t('trust.d6'), meta:'Instant' },
  ];
  return (
    <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} id="trust">
      <div style={{ ...wrap, padding: '110px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)', gap: 56, alignItems: 'center' }} className="why-grid">
          <div>
            <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 14 }}>{t('trust.eyebrow')}</div>
            <h2 style={{ fontSize: 'clamp(28px,3.6vw,46px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 18 }}>
              {t('trust.title')}
            </h2>
            <p style={{ fontSize: 18, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 28, textWrap: 'pretty' }}>
              {t('trust.sub')}
            </p>
            <div className="row" style={{ gap: 10, padding: '14px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--sh-xs)' }}>
              <span className="pulse" style={{ background: 'var(--primary)' }} />
              <span style={{ fontSize: 14, color: 'var(--ink-2)' }}>{t('trust.pill')}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
            {guards.map((g, i) => (
              <Reveal key={i} delay={i*70}>
                <div className="card" style={{ padding: 18, height: '100%' }}>
                  <div className="row between" style={{ marginBottom: 12 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}><Icon name={g.ic} size={18} /></span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{g.meta}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{g.t}</div>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>{g.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- S9 · Final CTA ---- */
interface FinalCTAProps {
  onEnter: () => void;
  onRequestDemo: () => void;
  onContact: () => void;
}

export function FinalCTA({ onEnter: _onEnter, onRequestDemo, onContact }: FinalCTAProps) {
  const { t } = useI18n();
  return (
    <section style={{ ...wrap, padding: '130px 28px 110px', textAlign: 'center' }}>
      <Reveal>
        <div style={{ position: 'relative', borderRadius: 30, overflow: 'hidden', padding: '88px 32px',
          background: 'radial-gradient(120% 140% at 50% 0%, var(--primary-soft), var(--surface) 70%)', border: '1px solid var(--border)' }}>
          <div className="grain" style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'relative' }}>
            <Mark size={52} tile />
            <h2 style={{ fontSize: 'clamp(32px,5vw,60px)', letterSpacing: '-0.04em', lineHeight: 1.02, margin: '26px auto 18px', maxWidth: 720 }}>
              {t('final.title1')}<br />{t('final.title2')}
            </h2>
            <p style={{ fontSize: 19, color: 'var(--ink-2)', maxWidth: 540, margin: '0 auto 34px', lineHeight: 1.5 }}>
              {t('final.sub')}
            </p>
            <div className="row center wrap" style={{ gap: 12 }}>
              <button className="btn btn-primary btn-lg" onClick={onRequestDemo}>{t('hero.cta')} <Icon name="arrowR" size={18} /></button>
              <button className="btn btn-ghost btn-lg" onClick={onContact}>{t('hero.contact')}</button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---- Footer ---- */
interface FooterProps {
  onEnter: () => void;
  onNav: (key: string) => void;
}

export function Footer({ onEnter, onNav }: FooterProps) {
  const { t } = useI18n();
  const go = (key: string) => { if (key === '_ws') onEnter && onEnter(); else onNav && onNav(key); };
  const cols = [
    { h:t('foot.product'), items:[[t('foot.workspace'),'_ws'],[t('foot.floor'),'_ws'],[t('foot.command'),'_ws'],[t('nav.pricing'),'landing']] as [string,string][] },
    { h:t('foot.company'), items:[[t('foot.about'),'about'],[t('trust.eyebrow'),'landing'],[t('foot.careers'),'careers'],[t('foot.contact'),'contact']] as [string,string][] },
    { h:t('foot.resources'), items:[[t('foot.cases'),'cases'],[t('nav.how'),'landing'],[t('foot.guarantees'),'guarantees'],[t('foot.status'),'status']] as [string,string][] },
  ];
  return (
    <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ ...wrap, padding: '56px 28px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) repeat(3,minmax(0,1fr))', gap: 36 }} className="footer-grid">
          <div>
            <Logo size={28} />
            <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5, marginTop: 16, maxWidth: 260 }}>
              {t('foot.tag')}
            </p>
          </div>
          {cols.map((c, i) => (
            <div key={i}>
              <div className="eyebrow" style={{ marginBottom: 16 }}>{c.h}</div>
              <div className="col" style={{ gap: 11 }}>
                {c.items.map(([label,key]) => <a key={label} href="#" onClick={e=>{e.preventDefault(); go(key);}} style={{ fontSize: 14, color: 'var(--ink-2)', cursor:'pointer' }}>{label}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div className="row between" style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{t('foot.copy')}</span>
          <span className="row" style={{ gap: 18, fontSize: 13, color: 'var(--ink-3)' }}>
            <a href="#" onClick={e=>{e.preventDefault(); go('privacy');}} style={{cursor:'pointer'}}>{t('foot.privacy')}</a>
            <a href="#" onClick={e=>{e.preventDefault(); go('terms');}} style={{cursor:'pointer'}}>{t('foot.terms')}</a>
            <a href="#" onClick={e=>{e.preventDefault(); go('security');}} style={{cursor:'pointer'}}>{t('foot.security')}</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
