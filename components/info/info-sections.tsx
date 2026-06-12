/* =========================================================================
   AGENTS VERSE — Info page section components
   Ports pages.jsx: AboutPage, CareersPage, ContactPage, ContactForm,
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
  return (
    <div style={{ ...wrap, paddingTop: 60, paddingBottom: 100 }}>
      <Reveal>
        <div className="row between wrap" style={{ gap: 20, padding: '40px 44px', borderRadius: 24, background: 'radial-gradient(130% 160% at 0% 0%, var(--primary-soft), var(--surface))', border: '1px solid var(--border)' }}>
          <div>
            <h2 style={{ fontSize: 28, letterSpacing: '-0.03em', marginBottom: 8 }}>See your new website first.</h2>
            <p style={{ fontSize: 16, color: 'var(--ink-2)' }}>Free working demo. No proposal, no obligation.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={onRequestDemo}>Request a free demo <Icon name="arrowR" size={18} /></button>
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
  const stats: [string, string][] = [['148', 'sites scanned daily'], ['3.4×', 'higher reply rate'], ['48h', 'lead to live demo'], ['8', 'AI departments']];
  const values = [
    { t: "Show, don’t tell", d: 'A working demo beats any pitch deck. We lead with proof, every time.' },
    { t: 'Controlled autonomy', d: 'AI does the volume; humans own trust, money and risk. Guardrails first.' },
    { t: 'Honest by default', d: 'We never overpromise results. Clear pricing, clear scope, no surprises.' },
    { t: "Craft at speed", d: "Premium work, shipped fast. Quality and velocity aren’t a trade-off here." },
  ];
  return (
    <>
      <InfoHero eyebrow="About" title="We replaced the proposal with a working demo." sub="Agents Verse is an autonomous, demo-first web agency. A company of specialized AI agents finds businesses with weak websites, rebuilds them as live previews, and prepares outreach — with a human in the loop wherever it counts." />
      <div style={{ ...wrap, paddingBottom: 20 }}>
        <Reveal><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 0, border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', background: 'var(--surface)' }}>
          {stats.map(([v, l], i) => (<div key={i} style={{ padding: '24px 22px', borderRight: i < stats.length - 1 ? '1px solid var(--border)' : 'none' }}><div style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--primary)' }}>{v}</div><div style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 4 }}>{l}</div></div>))}
        </div></Reveal>
      </div>
      <div style={{ ...wrap, paddingTop: 40, paddingBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.2fr)', gap: 56 }} className="why-grid">
          <Reveal><h2 style={{ fontSize: 'clamp(26px,3vw,36px)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Most agencies sell a promise. We send the result.</h2></Reveal>
          <div className="col" style={{ gap: 18 }}>
            <Reveal delay={80}><p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>We started Agents Verse with a simple frustration: small businesses are quoted thousands and shown nothing until weeks later. Meanwhile their customers are leaving sites that look a decade old.</p></Reveal>
            <Reveal delay={140}><p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>So we built a virtual company that does the opposite. Research agents find the businesses. Audit agents score the current site. Design and code agents build a real, working redesign. Sales agents prepare a personalized message. Only then — and only when it matters — does a human step in.</p></Reveal>
            <Reveal delay={200}><p style={{ fontSize: 16.5, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>The result is an agency that moves at software speed but earns trust like a craftsperson: by showing the work.</p></Reveal>
          </div>
        </div>
      </div>
      <div style={{ ...wrap, paddingTop: 50 }}>
        <div className="eyebrow" style={{ marginBottom: 22 }}>What we believe</div>
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
  const roles = [
    { t: 'Founding Design Engineer', team: 'Product', loc: 'Remote', d: 'Own the design system and the polish bar across every screen agents generate.' },
    { t: 'AI Systems Engineer', team: 'Agents', loc: 'Remote', d: 'Build and orchestrate the agent workforce — research, audit, design, code, sales.' },
    { t: 'Growth & Outreach Lead', team: 'Go-to-market', loc: 'Remote', d: 'Turn demo-first into a repeatable, respectful acquisition engine.' },
    { t: 'Client Success Manager', team: 'Support', loc: 'Da Nang / Remote', d: 'Keep live clients delighted — revisions, care, and the human touch.' },
  ];
  const perks = ['Remote-first, async by default', 'Top-tier equipment budget', 'Real ownership & equity', 'Quarterly team off-sites', 'Learning stipend', 'Ship-fast, low-meeting culture'];
  return (
    <>
      <InfoHero eyebrow="Careers" title="Build the agency that builds itself." sub="We’re a small team teaching a company of AI agents to do exceptional work. If you like high craft, high autonomy and high speed, you’ll fit right in." />
      <div style={{ ...wrap, paddingTop: 30 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Open roles</div>
        <div className="col" style={{ gap: 12 }}>
          {roles.map((r, i) => (<Reveal key={i} delay={i * 60}>
            <div className="card row between" style={{ padding: '20px 22px', gap: 16, flexWrap: 'wrap', cursor: 'pointer' }}>
              <div style={{ minWidth: 240, flex: 1 }}>
                <div className="row" style={{ gap: 10, marginBottom: 6 }}><span style={{ fontSize: 17, fontWeight: 600 }}>{r.t}</span><span className="badge badge-neutral">{r.team}</span></div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.45 }}>{r.d}</p>
              </div>
              <div className="row" style={{ gap: 16 }}>
                <span className="row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="pin" size={14} /> {r.loc}</span>
                <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={onRequestDemo}>Apply <Icon name="arrowUR" size={14} /></button>
              </div>
            </div>
          </Reveal>))}
        </div>
      </div>
      <div style={{ ...wrap, paddingTop: 50 }}>
        <div className="eyebrow" style={{ marginBottom: 18 }}>Why you’ll like it here</div>
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
      <h3 style={{ fontSize: 23, letterSpacing: '-0.02em', marginBottom: 12 }}>Message sent.</h3>
      <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 340, margin: '0 auto 24px' }}>Thanks {f.name.split(' ')[0]} — a real person will reply to {f.email} within one business day to plan {f.business}’s build.</p>
      <button className="btn btn-soft" onClick={() => { setSent(false); setF({ name: '', email: '', business: '', package: 'Business Website', message: '' }); }}>Send another</button>
    </div>
  );
  return (
    <div className="card-elev" style={{ padding: 30, boxShadow: 'var(--sh-lg)' }}>
      <h3 style={{ fontSize: 20, letterSpacing: '-0.02em', marginBottom: 4 }}>Send us a message</h3>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 22 }}>Liked your demo, or have a project in mind? Let’s talk.</p>
      <div className="col" style={{ gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{fld('Your name *', 'name', { placeholder: 'Jane Doe' })}{fld('Email *', 'email', { placeholder: 'you@business.com', type: 'email' })}</div>
        {fld('Business *', 'business', { placeholder: 'Atlas Dental Clinic' })}
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>What do you need?</span>
          <select value={f.package} onChange={e => setF(s => ({ ...s, package: e.target.value }))} style={{ width: '100%', height: 44, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)' }}>
            {['Landing Page', 'Business Website', 'Monthly Growth Care', 'Custom build', 'Not sure yet'].map(o => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>Message</span>
          <textarea value={f.message} onChange={e => setF(s => ({ ...s, message: e.target.value }))} rows={4} placeholder="Tell us a little about your business and goals."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14.5, color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-sans)' }} />
        </label>
        <button className="btn btn-primary btn-lg" disabled={!valid} onClick={() => setSent(true)} style={{ width: '100%', opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}>Send message <Icon name="arrowR" size={17} /></button>
        <p className="row" style={{ gap: 7, justifyContent: 'center', fontSize: 12, color: 'var(--ink-3)' }}><Icon name="shield" size={13} /> We reply within one business day. No spam, ever.</p>
      </div>
    </div>
  );
}

export interface ContactPageProps {
  onRequestDemo: () => void;
}

export function ContactPage({ onRequestDemo }: ContactPageProps) {
  const methods = [
    { ic: 'chat',   t: 'General enquiries', v: 'hello@agentsverse.ai' },
    { ic: 'deals',  t: 'Partnerships',      v: 'partners@agentsverse.ai' },
    { ic: 'shield', t: 'Press & security',  v: 'security@agentsverse.ai' },
  ];
  const steps = [
    { t: 'You reach out',       d: 'Send a message or request a free demo — whichever you prefer.' },
    { t: 'We reply in a day',   d: 'A real person responds within one business day with next steps.' },
    { t: 'We scope & quote',    d: 'Fixed pricing, clear timeline. Custom work is quoted by a human.' },
    { t: 'We build & launch',   d: 'Your site goes live, then optional monthly care keeps it sharp.' },
  ];
  return (
    <>
      <InfoHero eyebrow="Contact" title="Let’s build your website." sub="Loved your demo, or starting fresh? Tell us what you need — a real person replies within one business day." max={640} />
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
              <div className="eyebrow" style={{ marginBottom: 16 }}>What happens next</div>
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
                <span className="row" style={{ gap: 9, fontSize: 13.5, color: 'var(--ink-2)' }}><Icon name="pin" size={15} style={{ color: 'var(--ink-3)' }} /> Remote-first · Da Nang & Singapore</span>
                <span className="row" style={{ gap: 9, fontSize: 13.5, color: 'var(--ink-2)' }}><Icon name="clock" size={15} style={{ color: 'var(--ink-3)' }} /> ~1 business day reply</span>
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
  const cases = [
    { co: 'Atlas Dental Clinic',  ind: 'Healthcare · Houston',   hue: 200, before: 34, after: 88, result: '+162% appointment-booking clicks in the first month.', quote: "They sent a finished homepage before we’d even signed anything. That was the whole sell." },
    { co: 'Lumi Spa Studio',      ind: 'Wellness · Singapore',   hue: 300, before: 41, after: 92, result: 'Bookings moved fully online — 3× faster checkout.',       quote: "It feels like the brand we always wanted but never had time to build." },
    { co: 'GreenBite Restaurant', ind: 'Hospitality · Brooklyn', hue: 140, before: 38, after: 90, result: 'Reservations up, phone calls down — exactly the goal.',    quote: 'The demo arrived in our inbox and the decision made itself.' },
  ];
  return (
    <>
      <InfoHero eyebrow="Case studies" title="Real businesses. Real redesigns." sub="Every project starts the same way: a working demo, sent before the first conversation. Here’s how a few of them turned out." />
      <div style={{ ...wrap, paddingTop: 20 }}>
        <div className="col" style={{ gap: 24 }}>
          {cases.map((c, i) => (<Reveal key={i} delay={i * 80}>
            {/* Original markup carried a duplicate className where "showcase-grid" overrode
                "card-elev" (last-wins), so the card-elev surface never rendered. Reproduced
                here as showcase-grid only to keep the page pixel-identical to the original. */}
            <div className="showcase-grid" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)', gap: 26, alignItems: 'center', boxShadow: 'var(--sh-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><div className="row between" style={{ marginBottom: 8 }}><span className="eyebrow" style={{ color: 'var(--ink-3)' }}>Before</span><span className="badge badge-danger" style={{ height: 20 }}>{c.before}</span></div><SiteMock variant="old" hue={c.hue} chrome={false} ratio="66%" /></div>
                <div><div className="row between" style={{ marginBottom: 8 }}><span className="eyebrow" style={{ color: 'var(--primary)' }}>After</span><span className="badge badge-success" style={{ height: 20 }}>{c.after}</span></div><SiteMock variant="new" hue={c.hue} chrome={false} ratio="66%" /></div>
              </div>
              <div>
                <h3 style={{ fontSize: 22, marginBottom: 4 }}>{c.co}</h3>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>{c.ind}</div>
                <div className="row" style={{ gap: 8, marginBottom: 16, fontSize: 14.5, color: 'var(--ink)', fontWeight: 600 }}><Icon name="arrowUR" size={16} style={{ color: 'var(--success)' }} /> {c.result}</div>
                <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55, fontStyle: 'italic', textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>“{c.quote}”</p>
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
  const gs = [
    { ic: 'layers', t: 'Demo-first, always',      d: 'You see a working redesign of your own site before you pay a cent or sign anything.' },
    { ic: 'dollar', t: 'Fixed pricing, up front',  d: 'Every quote is fixed and explained before work starts. No creeping scope, no surprise invoices.' },
    { ic: 'user',   t: 'A human when it matters',  d: 'High-value deals, calls, and anything sensitive route to a real person — never left to automation alone.' },
    { ic: 'shield', t: 'No overpromising',         d: 'We never guarantee revenue, rankings or traffic. We guarantee a better website, delivered.' },
    { ic: 'clock',  t: 'On time, or we make it right', d: 'Miss an agreed launch date and your next month of care is on us.' },
    { ic: 'check',  t: 'Your data stays yours',    d: 'We use your business details only to build and discuss your demo. Nothing sold, nothing shared.' },
  ];
  return (
    <>
      <InfoHero eyebrow="Guarantees" title="What you can count on." sub="Demo-first only works if it’s built on trust. These are the promises we hold ourselves to — on every single engagement." />
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
  const comps: [string, string][] = [
    ['Lead finder', 'Operational'], ['Website audit engine', 'Operational'], ['Demo generator', 'Operational'],
    ['Outreach system', 'Operational'], ['Deployment pipeline', 'Operational'], ['Dashboard & API', 'Operational'],
  ];
  const incidents = [
    { d: 'May 28, 2026', t: 'Elevated demo-generation latency', s: 'Resolved', dur: '42 min',     note: 'A model provider slowdown queued demo jobs. Mitigated by failover; all jobs completed.' },
    { d: 'May 14, 2026', t: 'Outreach scheduling delay',        s: 'Resolved', dur: '1 hr 10 min', note: 'Follow-up sends were delayed. No messages were lost; queue drained automatically.' },
  ];
  return (
    <>
      <InfoHero eyebrow="System status" title="All systems operational." sub="Live status of the Agents Verse platform. Subscribe to updates from any page footer." max={620} />
      <div style={{ ...wrap, paddingTop: 20 }}>
        <Reveal>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
            <div className="row between" style={{ padding: '18px 22px', background: 'var(--success-soft)', borderBottom: '1px solid var(--border)' }}>
              <span className="row" style={{ gap: 11, fontSize: 16, fontWeight: 600, color: 'var(--success)' }}><span className="pulse" style={{ background: 'var(--success)' }} /> All systems operational</span>
              <span className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>99.98% uptime · 90 days</span>
            </div>
            <div style={{ padding: '6px 22px' }}>
              {comps.map(([n, s], i) => (<div key={i} className="row between" style={{ padding: '14px 0', borderBottom: i < comps.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                <span style={{ fontSize: 14.5 }}>{n}</span>
                <span className="row" style={{ gap: 8, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--success)' }} />{s}</span>
              </div>))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="eyebrow" style={{ margin: '14px 0 14px' }}>Recent incidents</div>
          <div className="col" style={{ gap: 12 }}>
            {incidents.map((inc, i) => (<div key={i} className="card" style={{ padding: '16px 20px' }}>
              <div className="row between" style={{ marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                <span className="row" style={{ gap: 10 }}><span style={{ fontSize: 15, fontWeight: 600 }}>{inc.t}</span><span className="badge badge-success">{inc.s}</span></span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{inc.d} · {inc.dur}</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{inc.note}</p>
            </div>))}
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
  return (
    <>
      <InfoHero eyebrow="Legal" title={title} sub={intro} max={680} />
      <div style={{ ...wrap, paddingTop: 10, paddingBottom: 90 }}>
        <div style={{ maxWidth: 760 }}>
          <Reveal><div className="row" style={{ gap: 8, marginBottom: 30, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="clock" size={14} /> Last updated {updated}</div></Reveal>
          {sections.map((s, i) => (<Reveal key={i} delay={Math.min(i * 40, 200)}>
            <div style={{ marginBottom: 28 }}>
              <h3 style={{ fontSize: 19, marginBottom: 10, letterSpacing: '-0.02em' }}>{i + 1}. {s.h}</h3>
              <p style={{ fontSize: 15.5, color: 'var(--ink-2)', lineHeight: 1.65, textWrap: 'pretty' as React.CSSProperties['textWrap'] }}>{s.body}</p>
            </div>
          </Reveal>))}
          <Reveal><p style={{ fontSize: 13.5, color: 'var(--ink-3)', marginTop: 10, paddingTop: 20, borderTop: '1px solid var(--border)' }}>Questions? Reach us at <span style={{ color: 'var(--primary)', fontWeight: 600 }}>legal@agentsverse.ai</span>. This document is a product prototype and not legal advice.</p></Reveal>
        </div>
      </div>
    </>
  );
}

const LEGAL: Record<string, LegalDocProps> = {
  privacy: { title: 'Privacy Policy', updated: 'June 2026', intro: 'How Agents Verse collects, uses and protects the information you share with us.',
    sections: [
      { h: 'What we collect',    body: 'When you request a demo we collect your business name, website URL, industry and contact details. When you use the workspace we store the data you enter and basic usage analytics to improve the product.' },
      { h: 'How we use it',      body: "We use your information to research your business, generate your demo, and follow up about it. We never sell your data, and we don’t use it to train third-party models." },
      { h: 'Outreach & consent', body: 'We only contact you about work you asked about or that is directly relevant to your business. Every message includes a clear way to stop hearing from us, and we honor opt-outs immediately.' },
      { h: 'Data retention',     body: 'Demo and request data is kept while your enquiry is active and for a reasonable period afterward. You can ask us to delete your data at any time and we will do so promptly.' },
      { h: 'Your rights',        body: "You can access, correct, export or delete the personal information we hold about you. Email us and we’ll action your request within a business week." },
      { h: 'Security',           body: 'Data is encrypted in transit and at rest, access is least-privilege, and sensitive actions are logged. See our Security page for more detail.' },
    ] },
  terms: { title: 'Terms of Service', updated: 'June 2026', intro: 'The agreement that governs your use of Agents Verse and the work we deliver.',
    sections: [
      { h: 'Using the service',  body: 'Agents Verse provides demo-first website design and build services, supported by an AI agent workforce with human oversight. You agree to use the service lawfully and to provide accurate information about your business.' },
      { h: 'Demos & ownership',  body: "Demos we send are free and non-binding. You’re under no obligation to proceed. On payment for a completed project, ownership of the final website and its content transfers to you." },
      { h: 'Pricing & payment',  body: 'Prices are fixed and quoted before work begins. Custom builds and integrations are quoted separately by a human. Recurring care plans renew monthly and can be cancelled anytime.' },
      { h: "What we don’t promise", body: 'We deliver a better website. We do not guarantee specific revenue, traffic, rankings or business outcomes, and any such claim would be made in error.' },
      { h: 'Revisions & delivery', body: 'Each package includes a defined number of revision rounds and a target launch window. Delays caused by missing client assets pause that window until materials are received.' },
      { h: 'Liability',          body: 'The service is provided “as is” to the extent permitted by law. Our liability for any claim is limited to the amount you paid for the engagement in question.' },
    ] },
  security: { title: 'Security', updated: 'June 2026', intro: "How we keep your data, your clients’ data and our automated systems safe.",
    sections: [
      { h: 'Encryption',          body: 'All traffic is encrypted in transit with TLS, and stored data is encrypted at rest. Secrets and credentials are held in a dedicated secrets manager, never in code.' },
      { h: 'Access control',      body: 'Team access is least-privilege and reviewed regularly. Administrative and outreach actions are logged so every external action is traceable.' },
      { h: 'Guardrailed automation', body: 'Agents operate inside hard limits: daily outreach caps, cost budgets, confidence thresholds, and mandatory human review for sensitive or high-value actions.' },
      { h: 'Outreach safety',     body: 'We enforce send limits and instant stop-on-request rules, and we never make outcome guarantees. The system is designed to be respectful, not a spam machine.' },
      { h: 'Monitoring & response', body: 'Systems are monitored continuously. If something goes wrong we mitigate first, then publish what happened on our public Status page.' },
      { h: 'Reporting an issue',  body: 'Found a vulnerability? Email security@agentsverse.ai. We investigate every report and aim to acknowledge within one business day.' },
    ] },
};

/** Renders the legal body for the given slug (privacy | terms | security). Returns null for unknown slugs. */
export function LegalBody({ slug }: { slug: string }) {
  const data = LEGAL[slug];
  if (!data) return null;
  return <LegalDoc {...data} />;
}
