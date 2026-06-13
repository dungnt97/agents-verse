/* =========================================================================
   AGENTS VERSE — ReviewCenter (port of ReviewCenter from app.jsx)
   Slide-in panel from the right. Approve/Open actions emit a toast via
   the onAction callback (wired to useToasts in the layout).
   ========================================================================= */
'use client';

import { Icon } from '@/components/brand/icon';
import { useI18n } from '@/lib/i18n';
import type { ToastKind } from '@/lib/providers/toast-provider';

/* Static items — titles and tags keyed via shell.rc* for i18n.
   Descriptive data (company name, score range, amounts) are data-layer
   values and intentionally left untranslated. */
const ITEMS = [
  { ic: 'layers', titleKey: 'shell.rcDemoTitle',    d: 'Atlas Dental Clinic · 34 → 88',         cls: 'badge-primary', tagKey: 'shell.rcDemoTag' },
  { ic: 'send',   titleKey: 'shell.rcOutreachTitle', d: 'GreenBite Restaurant · friendly tone',   cls: 'badge-info',    tagKey: 'shell.rcOutreachTag' },
  { ic: 'deals',  titleKey: 'shell.rcDealTitle',     d: 'Mekong Logistics · $5,200',              cls: 'badge-warning', tagKey: 'shell.rcDealTag' },
  { ic: 'user',   titleKey: 'shell.rcHumanTitle',    d: 'Nova Realty Group · $6,400',             cls: 'badge-danger',  tagKey: 'shell.rcHumanTag' },
  { ic: 'dollar', titleKey: 'shell.rcCostTitle',     d: 'AI spend at 86% of today’s budget', cls: 'badge-warning', tagKey: 'shell.rcCostTag' },
];

interface ReviewCenterProps {
  open: boolean;
  onClose: () => void;
  onAction: (msg: string, kind?: ToastKind) => void;
}

export function ReviewCenter({ open, onClose, onAction }: ReviewCenterProps) {
  const { t } = useI18n();

  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,18,12,.32)', backdropFilter: 'blur(2px)', animation: 'fade-in .25s' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '92vw', zIndex: 121, background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--sh-xl)', display: 'flex', flexDirection: 'column', animation: 'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>{t('shell.reviewCenter')}</h2>
            <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--warning)', color: '#fff', fontSize: 11.5, fontWeight: 600, display: 'grid', placeItems: 'center' }}>
              {ITEMS.length}
            </span>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor: 'var(--border)' }}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          <div className="col" style={{ gap: 10 }}>
            {ITEMS.map((it, i) => (
              <div key={i} style={{ padding: 14, borderRadius: 13, border: '1px solid var(--border)' }}>
                <div className="row between" style={{ marginBottom: 9 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-muted)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}>
                    <Icon name={it.ic} size={16} />
                  </span>
                  <span className={'badge ' + it.cls} style={{ height: 19, fontSize: 10.5 }}>{t(it.tagKey)}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{t(it.titleKey)}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 11 }}>{it.d}</div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary btn-sm grow" onClick={() => onAction('Approved · ' + t(it.titleKey), 'success')}>{t('shell.approve')}</button>
                  <button className="btn btn-ghost btn-sm grow" onClick={() => onAction('Opened · ' + t(it.titleKey))} style={{ borderColor: 'var(--border)' }}>{t('shell.open')}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
