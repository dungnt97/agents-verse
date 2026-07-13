/* =========================================================================
   AGENTS VERSE — DiscoveryTrigger
   Control to run lead discovery (industry + city). Both are DROPDOWNS drawn from the market catalog
   (MARKET_NICHES + MARKET_CATALOG metros) so the founder picks a curated, English-market target instead of
   typing free text. Calls the runDiscovery server action; on completion toasts the result and refreshes so
   the newly upserted leads appear in the pipeline. Fully i18n'd (EN/VI). Styled with the design tokens.
   ========================================================================= */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { useToast } from '@/lib/providers/toast-provider';
import { usePipelineAuditT } from '@/lib/i18n/keys/pipeline-audit';
import { runDiscovery } from '@/lib/actions/run-discovery';
import { MARKET_CATALOG, MARKET_NICHES } from '@/lib/discovery/market-catalog';

const controlStyle: React.CSSProperties = {
  height: 38,
  padding: '0 30px 0 12px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  fontSize: 13.5,
  color: 'var(--ink)',
  outline: 'none',
  cursor: 'pointer',
  // Native select: swap the OS chevron for one that matches the design system.
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
};

// Title-case a lowercase niche for display while keeping the raw value for the search query.
const label = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function DiscoveryTrigger() {
  const [industry, setIndustry] = useState(MARKET_NICHES[0]);
  const [city, setCity] = useState(MARKET_CATALOG[0].metros[0]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const { t } = usePipelineAuditT();

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
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t('discovery.title')}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{t('discovery.sub')}</div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label={t('discovery.industry')} style={{ ...controlStyle, width: 168 }}>
            {MARKET_NICHES.map((n) => (
              <option key={n} value={n}>{label(n)}</option>
            ))}
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} aria-label={t('discovery.city')} style={{ ...controlStyle, width: 190 }}>
            {MARKET_CATALOG.map((c) => (
              <optgroup key={c.code} label={c.name}>
                {c.metros.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <button className="btn btn-primary" onClick={run} disabled={pending} style={{ opacity: pending ? 0.6 : 1, cursor: pending ? 'wait' : 'pointer' }}>
            {pending ? t('discovery.running') : t('discovery.run')} <Icon name="arrowR" size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
