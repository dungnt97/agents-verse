/* =========================================================================
   AGENTS VERSE — DiscoveryTrigger
   Minimal control to run Google Places lead discovery (industry + city). Calls the
   runDiscovery server action; on completion toasts the result and refreshes so the
   newly upserted leads appear in the pipeline. Styled with the existing design tokens.
   No-op-friendly: the action returns a message when USE_DB / API key are not configured.
   ========================================================================= */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { useToast } from '@/lib/providers/toast-provider';
import { runDiscovery } from '@/lib/actions/run-discovery';

const inputStyle: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontSize: 13.5,
  color: 'var(--ink)',
  outline: 'none',
};

export function DiscoveryTrigger() {
  const [industry, setIndustry] = useState('dentists');
  const [city, setCity] = useState('Austin TX');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const run = () => {
    startTransition(async () => {
      const res = await runDiscovery({ industry, city });
      toast(res.message, res.upserted > 0 ? 'success' : 'warning');
      router.refresh();
    });
  };

  return (
    <div style={{ padding: '16px 28px 0' }}>
      <div className="card row between wrap" style={{ padding: '12px 16px', gap: 12 }}>
        <div className="row" style={{ gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-muted)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name="search" size={15} />
          </span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Lead discovery</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Scan Google Places for businesses with weak websites</div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" aria-label="Industry" style={{ ...inputStyle, width: 150 }} />
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" aria-label="City" style={{ ...inputStyle, width: 150 }} />
          <button className="btn btn-primary" onClick={run} disabled={pending} style={{ opacity: pending ? 0.6 : 1, cursor: pending ? 'wait' : 'pointer' }}>
            {pending ? 'Discovering…' : 'Run discovery'} <Icon name="arrowR" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
