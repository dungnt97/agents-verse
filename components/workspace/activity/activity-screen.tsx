/* =========================================================================
   AGENTS VERSE — ActivityScreen
   Port of activity.jsx → TypeScript / Next.js 'use client'.
   Reads AV.activity (static seed); filter chips + search box narrow the
   timeline list. goAgent / goRoom callbacks drive router navigation from
   the page layer.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { AV } from '@/lib/data';
import type { ToastKind } from '@/lib/providers/toast-provider';

/* -------------------------------------------------------------------------
   Prop types
   ------------------------------------------------------------------------- */

export interface ActivityScreenProps {
  onAction: (msg: string, kind?: ToastKind) => void;
  goAgent?: (id: string) => void;
  goRoom?: (id: string) => void;
}

/* -------------------------------------------------------------------------
   ActivityScreen
   ------------------------------------------------------------------------- */

export function ActivityScreen({ onAction, goAgent, goRoom }: ActivityScreenProps) {
  const { t } = useI18n();

  /* ACT_TYPE: labels resolved via t() so badges switch language at runtime.
     The map is rebuilt inside the component so t() is in scope. */
  const ACT_TYPE: Record<string, { label: string; icon: string; color: string }> = {
    lead:       { label: t('act.typeLead'),       icon: 'leads',    color: 'var(--info)'    },
    audit:      { label: t('act.typeAudit'),      icon: 'audits',   color: 'var(--info)'    },
    demo:       { label: t('act.typeDemo'),       icon: 'layers',   color: 'var(--violet)'  },
    outreach:   { label: t('act.typeOutreach'),   icon: 'send',     color: 'var(--primary)' },
    reply:      { label: t('act.typeReply'),      icon: 'activity', color: 'var(--success)' },
    deal:       { label: t('act.typeDeal'),       icon: 'deals',    color: 'var(--success)' },
    escalate:   { label: t('act.typeEscalation'), icon: 'alert',    color: 'var(--danger)'  },
    cost:       { label: t('act.typeCost'),       icon: 'dollar',   color: 'var(--warning)' },
    production: { label: t('act.typeProduction'), icon: 'bolt',     color: 'var(--primary)' },
  };

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');

  /* Filter labels keyed to stable internal IDs so FMAP lookup stays correct
     regardless of translated display label. */
  const FILTERS: { key: string; label: string }[] = [
    { key: 'All',         label: t('act.filterAll')         },
    { key: 'Leads',       label: t('act.filterLeads')       },
    { key: 'Demos',       label: t('act.filterDemos')       },
    { key: 'Outreach',    label: t('act.filterOutreach')    },
    { key: 'Replies',     label: t('act.filterReplies')     },
    { key: 'Deals',       label: t('act.filterDeals')       },
    { key: 'Escalations', label: t('act.filterEscalations') },
    { key: 'Cost',        label: t('act.filterCost')        },
    { key: 'Production',  label: t('act.filterProduction')  },
  ];

  // Maps filter key → activity type key — verbatim from activity.jsx:21
  const FMAP: Record<string, string> = {
    Leads: 'lead', Demos: 'demo', Outreach: 'outreach',
    Replies: 'reply', Deals: 'deal', Escalations: 'escalate',
    Cost: 'cost', Production: 'production',
  };

  const list = AV.activity.filter(a =>
    (filter === 'All' || a.type === FMAP[filter]) &&
    (a.text + (AV.agentById(a.agent)?.name || '') + (AV.roomById(a.room)?.name || ''))
      .toLowerCase().includes(q.toLowerCase()),
  );

  // Count per type for chip badges
  const counts = AV.activity.reduce<Record<string, number>>((m, a) => {
    m[a.type] = (m[a.type] || 0) + 1;
    return m;
  }, {});

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 20 }}>
        <div>
          <div className="row" style={{ gap: 11, marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, letterSpacing: '-0.03em' }}>{t('act.title')}</h1>
            <span className="badge badge-neutral">
              <span className="pulse" /> {t('ov.live')}
            </span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('act.sub')}</p>
        </div>
        <button
          className="btn btn-ghost"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onAction('Activity exported')}
        >
          <Icon name="doc" size={16} /> {t('act.exportLog')}
        </button>
      </div>

      {/* Filter chips + search */}
      <div className="row between wrap" style={{ gap: 12, marginBottom: 22 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const typeKey = FMAP[f.key];
            const c = f.key === 'All' ? AV.activity.length : (counts[typeKey] || 0);
            return (
              <button
                key={f.key}
                className={'chip' + (filter === f.key ? ' active' : '')}
                onClick={() => setFilter(f.key)}
                style={{ height: 34 }}
              >
                {f.label}<span className="mono" style={{ fontSize: 11, opacity: 0.7, marginLeft: 2 }}>{c}</span>
              </button>
            );
          })}
        </div>
        <div className="row" style={{ gap: 9, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', width: 230, maxWidth: '70vw' }}>
          <Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('act.searchPlaceholder')}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, width: '100%', color: 'var(--ink)' }}
          />
        </div>
      </div>

      {/* Timeline */}
      {list.length === 0
        ? (
          <div className="col center" style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 16, background: 'var(--surface)' }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--surface-muted)', color: 'var(--ink-3)', marginBottom: 16 }}>
              <Icon name="activity" size={24} />
            </span>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t('act.noActivity')}</div>
            <p style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 340, lineHeight: 1.45 }}>
              {t('act.noActivityDesc')}
            </p>
          </div>
        )
        : (
          <div className="card" style={{ padding: '8px 22px' }}>
            <div className="eyebrow" style={{ padding: '14px 0 6px' }}>{t('act.today')}</div>
            {list.map((a, i) => {
              const tType = ACT_TYPE[a.type] || ACT_TYPE.lead;
              const ag = AV.agentById(a.agent);
              const room = AV.roomById(a.room);
              return (
                <div key={i} className="row" style={{ gap: 16, alignItems: 'stretch' }}>
                  {/* Time + vertical rail */}
                  <div className="row" style={{ gap: 14, flex: 'none' }}>
                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)', width: 42, textAlign: 'right', paddingTop: 16 }}>
                      {a.t}
                    </span>
                    <div className="col center" style={{ width: 14 }}>
                      <span style={{ width: 3, height: 14, background: i === 0 ? 'transparent' : 'var(--border)' }} />
                      <span style={{
                        width: 11, height: 11, borderRadius: 99, background: tType.color, flex: 'none',
                        boxShadow: `0 0 0 3px color-mix(in oklab, ${tType.color} 16%, transparent)`,
                      }} />
                      <span style={{ width: 3, flex: 1, background: i === list.length - 1 ? 'transparent' : 'var(--border)' }} />
                    </div>
                  </div>
                  {/* Content row */}
                  <div
                    className="row between"
                    style={{
                      flex: 1, gap: 14, padding: '13px 0',
                      borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--border-soft)',
                      alignItems: 'center',
                    }}
                  >
                    <div className="row" style={{ gap: 12, minWidth: 0 }}>
                      <span style={{
                        width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none',
                        background: `color-mix(in oklab, ${tType.color} 13%, transparent)`,
                        color: tType.color,
                      }}>
                        <Icon name={tType.icon} size={17} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, lineHeight: 1.35 }}>{a.text}</div>
                        <div className="row" style={{ gap: 8, marginTop: 4 }}>
                          <button onClick={() => goAgent && goAgent(a.agent)} className="row focusable" style={{ gap: 6 }}>
                            <AgentAvatar id={a.agent} size={17} />
                            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ag?.name}</span>
                          </button>
                          <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--border-strong)' }} />
                          <button onClick={() => goRoom && goRoom(a.room)} style={{ fontSize: 11.5, color: 'var(--ink-3)' }} className="focusable">
                            {room?.short}
                          </button>
                        </div>
                      </div>
                    </div>
                    <span
                      className="badge badge-neutral"
                      style={{ flex: 'none', color: tType.color, background: `color-mix(in oklab, ${tType.color} 10%, transparent)` }}
                    >
                      <span className="dot" style={{ background: tType.color }} />{tType.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
