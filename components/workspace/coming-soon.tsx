/* =========================================================================
   AGENTS VERSE — ComingSoon (port of ComingSoon from app.jsx)
   Placeholder screen rendered by every stub route until its real screen
   is built in a later phase. onBack navigates to /overview via router.
   ========================================================================= */
'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { ROUTE_META } from './route-meta';

interface ComingSoonProps {
  route: string;
}

export function ComingSoon({ route }: ComingSoonProps) {
  const router = useRouter();
  const meta = ROUTE_META[route] ?? {};

  function onBack() {
    router.push('/overview');
  }

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      <div style={{ maxWidth: 560, margin: '8vh auto 0', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, margin: '0 auto 24px', display: 'grid', placeItems: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--primary)', boxShadow: 'var(--sh-md)' }}>
          {meta.icon && <Icon name={meta.icon} size={28} />}
        </div>
        <div className="badge badge-primary" style={{ marginBottom: 16 }}>Phase 2 · in design</div>
        <h1 style={{ fontSize: 30, letterSpacing: '-0.03em', marginBottom: 14 }}>{meta.label}</h1>
        <p style={{ fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 30, textWrap: 'pretty' }}>{meta.desc}</p>
        <div className="row center" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onBack} style={{ borderColor: 'var(--border)' }}>
            <Icon name="overview" size={16} /> Back to Overview
          </button>
          <button className="btn btn-primary" onClick={() => router.push('/command')}>Open Command Center</button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 30 }}>
          The first three screens — Landing, Floor Overview and Command Center — set the design bar for this page.
        </p>
      </div>
    </div>
  );
}
