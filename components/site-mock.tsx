/* =========================================================================
   AGENTS VERSE — SiteMock: schematic website previews (old vs. premium)
   Used in hero, before/after showcase, demo manager.
   Pure presentational — no hooks, no client directive needed.
   ========================================================================= */
import type { CSSProperties } from 'react';

export interface BarProps {
  w: number | string;
  h?: number;
  c?: string;
  r?: number;
  o?: number;
  mb?: number;
}

export function Bar({ w, h = 6, c = 'var(--ink-3)', r = 3, o = 1, mb = 0 }: BarProps) {
  return <div style={{ width: w, height: h, borderRadius: r, background: c, opacity: o, marginBottom: mb, flex: 'none' }} />;
}

export interface OldSiteProps {
  hue?: number;
}

/* OLD — dated, cramped, harsh. Reads instantly as a bad 2009 website. */
export function OldSite({ hue: _hue = 210 }: OldSiteProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f3efe2', fontFamily: 'Georgia, "Times New Roman", serif',
      display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* clunky header */}
      <div style={{ background: '#2b3a67', padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: '#ffd34d', fontWeight: 700, fontSize: 9, fontStyle: 'italic' }}>★ Business Co.</div>
        <div style={{ background: '#c0271e', color: '#fff', fontSize: 6.5, fontWeight: 700, padding: '2px 5px', borderRadius: 2 }}>CALL NOW!</div>
      </div>
      <div style={{ background: '#1d2746', display: 'flex', gap: 7, padding: '3px 8px' }}>
        {['Home','About','Services','Contact'].map(t => <span key={t} style={{ color: '#9fd0ff', fontSize: 6, textDecoration: 'underline' }}>{t}</span>)}
      </div>
      {/* body */}
      <div style={{ padding: '9px 9px 0', flex: 1, display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#7a2d2d', fontSize: 9, fontWeight: 700, marginBottom: 4, lineHeight: 1.1 }}>Welcome To Our Website!!</div>
          <Bar w="100%" h={4} c="#b9b09a" mb={3} /><Bar w="92%" h={4} c="#b9b09a" mb={3} />
          <Bar w="96%" h={4} c="#b9b09a" mb={3} /><Bar w="70%" h={4} c="#b9b09a" mb={6} />
          <Bar w="60%" h={4} c="#9fb" o={0} mb={2} />
          <span style={{ color: '#1442b0', fontSize: 6.5, textDecoration: 'underline' }}>Click here to learn more »</span>
        </div>
        {/* clip-art image box */}
        <div style={{ width: 64, height: 50, background: 'repeating-linear-gradient(45deg,#d9d2bf,#d9d2bf 4px,#cfc7b2 4px,#cfc7b2 8px)',
          border: '2px ridge #b3a98f', display: 'grid', placeItems: 'center', flex: 'none' }}>
          <span style={{ fontSize: 6, color: '#8a7f63' }}>[ photo ]</span>
        </div>
      </div>
      <div style={{ marginTop: 'auto', background: '#dcd5c2', borderTop: '1px solid #b3a98f', padding: '3px 8px', fontSize: 5.5, color: '#7a715a' }}>
        © 2009 · Visitors: 004127 · Best viewed in 1024×768
      </div>
    </div>
  );
}

export interface NewSiteProps {
  hue?: number;
  accent?: string;
}

/* NEW — premium redesign. Clean, structured, confident. */
export function NewSite({ hue = 210, accent = 'var(--primary)' }: NewSiteProps) {
  const card = (extra: CSSProperties): CSSProperties => ({ background: 'var(--surface-elev)', borderRadius: 6, border: '1px solid var(--border-soft)', ...extra });
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--font-sans)' }}>
      {/* nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 11px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 11, height: 11, borderRadius: 4, background: accent }} />
          <Bar w={34} h={5} c="var(--ink)" />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Bar w={16} h={4} c="var(--ink-3)" /><Bar w={16} h={4} c="var(--ink-3)" /><Bar w={16} h={4} c="var(--ink-3)" />
          <div style={{ background: accent, borderRadius: 5, padding: '4px 8px' }}><Bar w={22} h={4} c="#fff" /></div>
        </div>
      </div>
      {/* hero */}
      <div style={{ padding: '6px 11px', display: 'flex', gap: 10, flex: 1 }}>
        <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'inline-block', background: 'var(--surface-muted)', borderRadius: 99, padding: '2px 6px', marginBottom: 6, width: 'fit-content' }}><Bar w={40} h={3.5} c="var(--ink-3)" /></div>
          <Bar w="94%" h={9} c="var(--ink)" r={4} mb={4} /><Bar w="74%" h={9} c="var(--ink)" r={4} mb={6} />
          <Bar w="88%" h={4} c="var(--ink-3)" mb={3} /><Bar w="64%" h={4} c="var(--ink-3)" mb={8} />
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ background: accent, borderRadius: 6, padding: '5px 11px' }}><Bar w={30} h={4.5} c="#fff" /></div>
            <div style={{ border: '1px solid var(--border-strong)', borderRadius: 6, padding: '5px 11px' }}><Bar w={26} h={4.5} c="var(--ink-2)" /></div>
          </div>
        </div>
        <div style={{ flex: 1, borderRadius: 8, background: `linear-gradient(145deg, oklch(0.62 0.14 ${hue}), oklch(0.46 0.16 ${hue}))`,
          minHeight: 64, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,.35), transparent 55%)' }} />
          <div style={{ position: 'absolute', left: 8, bottom: 8, right: 8 }}>
            <Bar w="60%" h={4} c="rgba(255,255,255,.85)" mb={3} /><Bar w="40%" h={4} c="rgba(255,255,255,.5)" />
          </div>
        </div>
      </div>
      {/* feature row */}
      <div style={{ display: 'flex', gap: 6, padding: '0 11px 10px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={card({ flex: 1, padding: 6 })}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--primary-soft)', marginBottom: 5 }} />
            <Bar w="80%" h={3.5} c="var(--ink-2)" mb={2.5} /><Bar w="60%" h={3.5} c="var(--ink-3)" />
          </div>
        ))}
      </div>
    </div>
  );
}

export interface SiteMockProps {
  variant?: 'new' | 'old';
  hue?: number;
  chrome?: boolean;
  label?: string;
  ratio?: string;
  style?: CSSProperties;
}

/* Framed device-less screen with optional browser chrome */
export function SiteMock({ variant = 'new', hue = 210, chrome = true, label, ratio = '62%', style }: SiteMockProps) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--sh-md)', ...style }}>
      {chrome && (
        <div style={{ height: 22, background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', padding: '0 9px', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--border-strong)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--border-strong)' }} />
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--border-strong)' }} />
          {label && <span style={{ marginLeft: 8, fontSize: 9.5, color: 'var(--ink-3)' }} className="mono">{label}</span>}
        </div>
      )}
      <div style={{ position: 'relative', width: '100%', paddingTop: ratio }}>
        {variant === 'old' ? <OldSite hue={hue} /> : <NewSite hue={hue} />}
      </div>
    </div>
  );
}
