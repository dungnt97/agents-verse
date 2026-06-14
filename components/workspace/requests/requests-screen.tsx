/* =========================================================================
   AGENTS VERSE — RequestsScreen + RequestCard
   Port of requests.jsx admin inbox → TypeScript / Next.js 'use client'.
   DemoRequestModal already lives in components/marketing — NOT re-ported here.
   Reads/writes useWorkspaceState().requests via props; converts to pipeline
   leads via onConvertLead (→ addLead in WorkspaceStateProvider).
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { CountUp } from '@/components/ui/count-up';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { REQ_STATUS, hueFor } from '@/lib/data/format';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import type { DemoRequest } from '@/lib/data/types';
import type { ToastKind } from '@/lib/providers/toast-provider';

/* -------------------------------------------------------------------------
   Prop types
   ------------------------------------------------------------------------- */

export interface RequestsScreenProps {
  requests: DemoRequest[];
  setRequests: React.Dispatch<React.SetStateAction<DemoRequest[]>>;
  onAction: (msg: string, kind?: ToastKind) => void;
  goLead?: () => void;
  onConvertLead?: (r: DemoRequest) => void;
}

interface RequestCardProps {
  r: DemoRequest;
  onAction: (msg: string, kind?: ToastKind) => void;
  onConvert: (r: DemoRequest) => void;
  onUpdate: (id: string, status: string) => void;
}

/* -------------------------------------------------------------------------
   OverviewBand — local reuse of the same pattern from rooms.jsx / requests.jsx
   ------------------------------------------------------------------------- */

interface BandItem {
  label: string;
  value: number;
  icon: string;
  accent?: string;
  suffix?: string;
}

function OverviewBand({ items }: { items: BandItem[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`,
        gap: 0,
        border: '1px solid var(--border)',
        borderRadius: 16,
        background: 'var(--surface)',
        overflow: 'hidden',
        marginBottom: 22,
      }}
      className="ov-band"
    >
      {items.map((it, i) => (
        <div key={i} style={{ padding: '15px 18px', borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div className="row" style={{ gap: 7, marginBottom: 8, color: it.accent || 'var(--ink-3)' }}>
            <Icon name={it.icon} size={15} />
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{it.label}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}>
            <CountUp end={it.value} suffix={it.suffix || ''} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   RequestCard
   ------------------------------------------------------------------------- */

function RequestCard({ r, onAction, onConvert, onUpdate }: RequestCardProps) {
  const { t } = useI18n();
  const st = REQ_STATUS[r.status] ?? REQ_STATUS.new;
  const hue = hueFor(r.industry);

  return (
    <div
      className="card"
      style={{
        padding: '16px 18px',
        borderColor: r.status === 'new'
          ? 'color-mix(in oklab,var(--warning) 35%, var(--border))'
          : 'var(--border)',
      }}
    >
      {/* Card header: industry dot + name/meta + status badge */}
      <div className="row between" style={{ marginBottom: 11 }}>
        <span className="row" style={{ gap: 12, minWidth: 0 }}>
          <span style={{
            width: 40, height: 40, borderRadius: 11,
            background: `oklch(0.62 0.13 ${hue} / .16)`,
            display: 'grid', placeItems: 'center', flex: 'none',
          }}>
            <span style={{ width: 10, height: 10, borderRadius: 99, background: `oklch(0.6 0.15 ${hue})` }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.business}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
              {r.industry} · {r.city} · {r.t}
            </div>
          </span>
        </span>
        <span className={'badge ' + st.cls}>
          {r.status === 'new' && <span className="dot" style={{ background: 'currentColor' }} />}
          {t('req.status' + r.status.charAt(0).toUpperCase() + r.status.slice(1))}
        </span>
      </div>

      {/* Message bubble — curly quotes preserved verbatim from source */}
      <p style={{
        fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 13,
        padding: '11px 13px', background: 'var(--surface-muted)', borderRadius: 10,
      }}>
        &ldquo;{r.message}&rdquo;
      </p>

      {/* Contact row */}
      <div className="row between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <span className="row" style={{ gap: 8, minWidth: 0 }}>
          <Icon name="user" size={14} style={{ color: 'var(--ink-3)' }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {r.email}
          </span>
        </span>
        {r.url
          ? (
            <span className="row mono" style={{ gap: 5, fontSize: 11.5, color: 'var(--ink-3)' }}>
              {r.url} <Icon name="external" size={11} />
            </span>
          )
          : (
            <span className="badge badge-neutral" style={{ height: 19, fontSize: 10.5 }}>{t('req.noSiteYet')}</span>
          )}
      </div>

      {/* Action buttons */}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={() => onConvert(r)}>
          {t('req.runAuditConvert')}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => { onUpdate(r.id, 'contacted'); onAction('Reply sent to ' + r.name, 'success'); }}
        >
          {t('req.reply')}
        </button>
        {r.status !== 'declined' && (
          <button
            className="btn btn-soft btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => { onUpdate(r.id, 'declined'); onAction('Request declined', 'warning'); }}
          >
            {t('req.decline')}
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   RequestsScreen
   ------------------------------------------------------------------------- */

export function RequestsScreen({
  requests, setRequests, onAction, goLead,
}: RequestsScreenProps) {
  const { t } = useI18n();
  const { setRequestStatus, convertRequest } = useWorkspaceState();

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');

  /* Filter keys are stable internal values; labels are translated. */
  const FILTERS: { key: string; label: string }[] = [
    { key: 'All',       label: t('req.filterAll')       },
    { key: 'New',       label: t('req.filterNew')       },
    { key: 'Reviewing', label: t('req.filterReviewing') },
    { key: 'Contacted', label: t('req.filterContacted') },
    { key: 'Converted', label: t('req.filterConverted') },
  ];

  const list = requests.filter(r =>
    (filter === 'All' || REQ_STATUS[r.status]?.label === filter) &&
    (r.business + r.name + r.email + r.industry).toLowerCase().includes(q.toLowerCase()),
  );

  const c = (s: string) => requests.filter(r => r.status === s).length;

  const update = (id: string, status: string) => {
    setRequests(x => x.map(r => r.id === id ? { ...r, status } : r));
    setRequestStatus(id, status);
  };

  const convert = (r: DemoRequest) => {
    // convertRequest handles it all: optimistic request→converted + optimistic local lead +
    // the single DB write (convertRequestToLead). Do NOT also call addLead — that creates a
    // second lead row (no unique on company at the time of the race).
    convertRequest(r.id);
    onAction('Converting ' + r.business + ' → audit started', 'success');
    setTimeout(() => goLead && goLead(), 500);
  };

  const newCount = c('new');

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1180, margin: '0 auto' }}>
      {/* Header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 22 }}>
        <div>
          <div className="row" style={{ gap: 11, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, letterSpacing: '-0.03em' }}>{t('req.title')}</h1>
            {newCount > 0 && (
              <span className="badge badge-warning" style={{ height: 24 }}>
                <span className="dot" style={{ background: 'currentColor' }} />
                {newCount} {t('common.new')}
              </span>
            )}
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('req.sub')}</p>
        </div>
      </div>

      {/* Stats band */}
      <OverviewBand items={[
        { label: t('req.totalRequests'), value: requests.length,                                                                          icon: 'send'     },
        { label: t('req.statNew'),       value: c('new'),                                                                                 icon: 'alert',    accent: 'var(--warning)'  },
        { label: t('req.statReviewing'), value: c('reviewing'),                                                                           icon: 'search',   accent: 'var(--info)'     },
        { label: t('req.statContacted'), value: c('contacted'),                                                                           icon: 'activity', accent: 'var(--primary)'  },
        { label: t('req.statConverted'), value: c('converted'),                                                                           icon: 'check',    accent: 'var(--success)'  },
        { label: t('req.statConversion'),value: requests.length ? Math.round(c('converted') / requests.length * 100) : 0,                icon: 'arrowUR',  accent: 'var(--success)', suffix: '%' },
      ]} />

      {/* Filter chips + search */}
      <div className="row between wrap" style={{ gap: 12, marginBottom: 20 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.key} className={'chip' + (filter === f.key ? ' active' : '')} onClick={() => setFilter(f.key)} style={{ height: 36 }}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 9, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', width: 230, maxWidth: '70vw' }}>
          <Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('req.searchPlaceholder')}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, width: '100%', color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* Cards grid or empty state */}
      {list.length === 0
        ? (
          <div className="col center" style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 16, background: 'var(--surface)' }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--surface-muted)', color: 'var(--ink-3)', marginBottom: 16 }}>
              <Icon name="send" size={24} />
            </span>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t('req.noRequests')}</div>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 340, lineHeight: 1.45 }}>
              {t('req.noRequestsDesc')}
            </p>
          </div>
        )
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 16 }}>
            {list.map(r => (
              <RequestCard key={r.id} r={r} onAction={onAction} onConvert={convert} onUpdate={update} />
            ))}
          </div>
        )}
    </div>
  );
}
