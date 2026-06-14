/* =========================================================================
   AGENTS VERSE — ReviewCenter
   Slide-in panel from the right. Lists OPEN escalations (founder approval queue).
   Approve/Dismiss resolve the escalation; deal escalations also advance the deal.
   In demo mode (no DB) the actions degrade to a cosmetic toast.
   ========================================================================= */
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { useI18n } from '@/lib/i18n';
import type { ToastKind } from '@/lib/providers/toast-provider';
import type { Escalation } from '@/lib/data/types';
import { resolveEscalation, approveDealEscalation, rejectDealEscalation } from '@/lib/actions/escalations';
import { fmt } from '@/lib/data/format';

interface ReviewCenterProps {
  open: boolean;
  onClose: () => void;
  onAction: (msg: string, kind?: ToastKind) => void;
  escalations: Escalation[];
  useDb: boolean;
}

// Icon + badge styling derived from the escalation kind/severity (presentation only).
const iconFor = (kind: string) =>
  kind === 'deal' ? 'deals' : kind === 'cost' ? 'dollar' : kind === 'human' ? 'user' : 'layers';
const badgeFor = (sev: string) =>
  sev === 'high' ? 'badge-danger' : sev === 'medium' ? 'badge-warning' : 'badge-info';

export function ReviewCenter({ open, onClose, onAction, escalations, useDb }: ReviewCenterProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const run = (
    e: Escalation,
    action: () => Promise<{ ok: boolean; message?: string }>,
    verb: string,
    kind: ToastKind,
  ) => {
    // Demo mode: no DB — degrade to a cosmetic toast (consistent with the rest of the app).
    if (!useDb) {
      onAction(`${verb} · ${e.title}`, kind);
      return;
    }
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        router.refresh();
        onAction(`${verb} · ${e.title}`, kind);
      } else {
        onAction(res.message ?? 'Action failed', 'danger');
      }
    });
  };

  const approve = (e: Escalation) =>
    run(
      e,
      () => (e.kind === 'deal' && e.dealId ? approveDealEscalation(e.id) : resolveEscalation(e.id, 'resolved')),
      t('shell.approve'),
      'success',
    );
  const dismiss = (e: Escalation) =>
    run(
      e,
      () => (e.kind === 'deal' && e.dealId ? rejectDealEscalation(e.id) : resolveEscalation(e.id, 'dismissed')),
      t('shell.dismiss'),
      'warning',
    );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,18,12,.32)', backdropFilter: 'blur(2px)', animation: 'fade-in .25s' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '92vw', zIndex: 121, background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--sh-xl)', display: 'flex', flexDirection: 'column', animation: 'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>{t('shell.reviewCenter')}</h2>
            <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--warning)', color: '#fff', fontSize: 11.5, fontWeight: 600, display: 'grid', placeItems: 'center' }}>
              {escalations.length}
            </span>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor: 'var(--border)' }}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {escalations.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>{t('shell.rcEmpty')}</div>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {escalations.map((e) => (
                <div key={e.id} style={{ padding: 14, borderRadius: 13, border: '1px solid var(--border)' }}>
                  <div className="row between" style={{ marginBottom: 9 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--surface-muted)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}>
                      <Icon name={iconFor(e.kind)} size={16} />
                    </span>
                    <span className={'badge ' + badgeFor(e.sev)} style={{ height: 19, fontSize: 10.5 }}>{e.kind}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{e.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 11 }}>
                    {e.who}{e.value > 0 ? ' · ' + fmt.money(e.value) : ''}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-primary btn-sm grow" disabled={pending} onClick={() => approve(e)}>{t('shell.approve')}</button>
                    <button className="btn btn-ghost btn-sm grow" disabled={pending} onClick={() => dismiss(e)} style={{ borderColor: 'var(--border)' }}>{t('shell.dismiss')}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
