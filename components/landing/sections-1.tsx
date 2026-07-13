/* =========================================================================
   AGENTS VERSE — Landing sections 1–6
   SectionHead, DifferenceSection, HowItWorks, Showcase,
   InsideCompany, WhyWins.
   ========================================================================= */
'use client';

import { wrap } from './layout-constants';
import { Icon } from '@/components/brand/icon';
import { Logo } from '@/components/brand/logo';
import { Reveal } from '@/components/ui/reveal';
import { FloorMap } from '@/components/floor-map';
import { useI18n } from '@/lib/i18n';

/* ---- Shared section header ---- */
interface SectionHeadProps {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  center?: boolean;
  light?: boolean;
}

export function SectionHead({ eyebrow, title, sub, center, light }: SectionHeadProps) {
  return (
    <div style={{ maxWidth: center ? 720 : 760, margin: center ? '0 auto' : 0, textAlign: center ? 'center' : 'left', marginBottom: 44 }}>
      <Reveal><div className="eyebrow" style={{ color: light ? 'rgba(255,255,255,.6)' : 'var(--primary)', marginBottom: 14 }}>{eyebrow}</div></Reveal>
      <Reveal delay={60}><h2 style={{ fontSize: 'clamp(28px,3.6vw,46px)', letterSpacing: '-0.035em', lineHeight: 1.05, color: light ? '#fff' : 'var(--ink)' }}>{title}</h2></Reveal>
      {sub && <Reveal delay={120}><p style={{ marginTop: 16, fontSize: 18, color: light ? 'rgba(255,255,255,.7)' : 'var(--ink-2)', lineHeight: 1.5, textWrap: 'pretty' }}>{sub}</p></Reveal>}
    </div>
  );
}

/* ---- S2 · Demo-first difference ---- */
export function DifferenceSection() {
  const { t } = useI18n();
  const trad = [t('diff.trad1'),t('diff.trad2'),t('diff.trad3'),t('diff.trad4'),t('diff.trad5')];
  const ours = [t('diff.our1'),t('diff.our2'),t('diff.our3'),t('diff.our4'),t('diff.our5')];
  return (
    <section style={{ ...wrap, padding: '110px 28px' }}>
      <SectionHead eyebrow={t('diff.eyebrow')} title={t('diff.title')} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 22, alignItems: 'stretch' }}>
        {/* traditional */}
        <Reveal>
          <div className="card" style={{ padding: 28, height: '100%', background: 'var(--surface-muted)', borderStyle: 'dashed' }}>
            <div className="row between" style={{ marginBottom: 22 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-2)' }}>{t('diff.trad')}</span>
              <span className="badge badge-neutral">{t('diff.tradTime')}</span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              {trad.map((item, i) => (
                <div key={i} className="row" style={{ gap: 12, padding: '11px 0', borderBottom: i < trad.length-1 ? '1px solid var(--border)' : 'none', opacity: 0.5 + i*0.0 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 99, border: '1.5px dashed var(--border-strong)', flex: 'none' }} />
                  <span style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-3)', fontStyle: 'italic' }}>{t('diff.tradNote')}</div>
          </div>
        </Reveal>
        {/* ours */}
        <Reveal delay={120}>
          <div className="card-elev" style={{ padding: 28, height: '100%', position: 'relative', overflow: 'hidden',
            boxShadow: 'var(--sh-lg)', borderColor: 'var(--primary)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--primary), var(--info))' }} />
            <div className="row between" style={{ marginBottom: 22 }}>
              <span className="row" style={{ gap: 8, fontSize: 14, fontWeight: 600 }}><Logo size={20} mono /> Agents Verse</span>
              <span className="badge badge-primary">{t('diff.ourTime')}</span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              {ours.map((item, i) => (
                <div key={i} className="row" style={{ gap: 12, padding: '11px 0', borderBottom: i < ours.length-1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 99, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
                    <Icon name="check" size={13} sw={2.4} />
                  </span>
                  <span style={{ fontSize: 14.5, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 18, gap: 8, fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
              <Icon name="bolt" size={15} /> {t('diff.ourNote')}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---- S3 · How it works (timeline) ---- */
export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { ic:'search',  t:t('how.find'),   d:t('how.findD') },
    { ic:'audits',  t:t('how.audit'),  d:t('how.auditD') },
    { ic:'layers',  t:t('how.demo'),   d:t('how.demoD') },
    { ic:'send',    t:t('how.send'),   d:t('how.sendD') },
    { ic:'activity',t:t('how.reply'),  d:t('how.replyD') },
    { ic:'deals',   t:t('how.close'),  d:t('how.closeD') },
  ];
  return (
    <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }} id="how">
      <div style={{ ...wrap, padding: '110px 28px' }}>
        <SectionHead eyebrow={t('how.eyebrow')} title={t('how.title')} center />
        <div style={{ position: 'relative', marginTop: 10 }}>
          {/* connector line */}
          <svg viewBox="0 0 100 4" preserveAspectRatio="none" style={{ position: 'absolute', top: 27, left: 0, width: '100%', height: 4, overflow: 'visible', display: 'block' }} className="hide-mobile">
            <path d="M2 2 H98" stroke="var(--border-strong)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
            <path d="M2 2 H98" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeDasharray="6 10" style={{ animation:'flow-dash 1.4s linear infinite' }} opacity="0.8" />
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 22, position: 'relative' }}>
            {steps.map((s, i) => (
              <Reveal key={i} delay={i*90}>
                <div className="col" style={{ alignItems: 'flex-start' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface-elev)', border: '1px solid var(--border)',
                    display: 'grid', placeItems: 'center', color: 'var(--primary)', boxShadow: 'var(--sh-md)', marginBottom: 18, position: 'relative' }}>
                    <Icon name={s.ic} size={23} />
                    <span className="mono" style={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20, borderRadius: 99, background: 'var(--ink)', color: 'var(--bg)', fontSize: 10, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{i+1}</span>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>{s.t}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{s.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


/* ---- S5 · Inside the AI company ---- */
export function InsideCompany() {
  const { t } = useI18n();
  return (
    <section style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ ...wrap, padding: '110px 28px' }}>
        <SectionHead eyebrow={t('inside.eyebrow')} title={t('inside.title')}
          sub={t('inside.sub')} />
        <Reveal>
          <div className="card-elev" style={{ padding: 22, boxShadow: 'var(--sh-lg)' }}>
            <FloorMap compact />
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginTop: 22 }}>
          {[
            { t:t('inside.g1'), d:t('inside.g1d'), n:t('inside.rooms') },
            { t:t('inside.g2'), d:t('inside.g2d'), n:t('inside.rooms') },
            { t:t('inside.g3'), d:t('inside.g3d'), n:t('inside.rooms') },
            { t:t('inside.g4'), d:t('inside.g4d'), n:t('inside.rooms') },
          ].map((g, i) => (
            <Reveal key={i} delay={i*80}>
              <div className="card" style={{ padding: 18, height: '100%' }}>
                <div className="row between" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{g.t}</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{g.n}</span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{g.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- S6 · Why demo-first wins ---- */
export function WhyWins() {
  const { t } = useI18n();
  const points = [
    { t:t('why.p1'), d:t('why.p1d') },
    { t:t('why.p2'), d:t('why.p2d') },
    { t:t('why.p3'), d:t('why.p3d') },
    { t:t('why.p4'), d:t('why.p4d') },
  ];
  return (
    <section style={{ ...wrap, padding: '110px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)', gap: 56, alignItems: 'start' }} className="why-grid">
        <div style={{ position: 'sticky', top: 100 }}>
          <SectionHead eyebrow={t('why.eyebrow')} title={t('why.title')} />
        </div>
        <div className="col" style={{ gap: 0 }}>
          {points.map((p, i) => (
            <Reveal key={i} delay={i*90}>
              <div className="row" style={{ gap: 18, padding: '24px 0', borderBottom: i<points.length-1?'1px solid var(--border)':'none', alignItems: 'flex-start' }}>
                <span className="mono" style={{ fontSize: 13, color: 'var(--primary)', paddingTop: 3, fontWeight: 600 }}>0{i+1}</span>
                <div>
                  <h3 style={{ fontSize: 20, marginBottom: 8 }}>{p.t}</h3>
                  <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.55, textWrap: 'pretty' }}>{p.d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
