'use client';
/* =========================================================================
   AGENTS VERSE — AgentsIndex
   Grid of all agents with filter/sort bar and overview metrics band.
   AgentsIndex + AgentCard + helpers.
   ========================================================================= */

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfidenceRing } from '@/components/ui/confidence-ring';
import { CountUp } from '@/components/ui/count-up';
import { useI18n } from '@/lib/i18n';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { ROOM_ICON } from '@/components/floor-map';
import type { Agent } from '@/lib/data/types';
import { EmptyState } from '@/components/workspace/rooms/rooms-index';
// Side-effect import: merges rooms.* + agents.* keys into AV_DICT
import '@/lib/i18n/keys/rooms-agents';

/* -------------------------------------------------------------------------
   OverviewBand — metrics row (identical to rooms version, inlined for
   module isolation — avoids cross-screen coupling)
   ------------------------------------------------------------------------- */
interface BandItem {
  label: string;
  value: number;
  icon: string;
  suffix?: string;
  accent?: string;
}

function OverviewBand({ items }: { items: BandItem[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 0, border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', overflow: 'hidden', marginBottom: 22 }} className="ov-band">
      {items.map((it, i) => (
        <div key={i} style={{ padding: '15px 18px', borderRight: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div className="row" style={{ gap: 7, marginBottom: 8, color: it.accent || 'var(--ink-3)' }}><Icon name={it.icon} size={15} /><span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>{it.label}</span></div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}><CountUp end={it.value} suffix={it.suffix || ''} /></div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   AgentCard — single agent tile in the grid
   ------------------------------------------------------------------------- */
interface AgentCardProps {
  id: string;
  onOpen: (id: string) => void;
  onRoom: (id: string) => void;
}

function AgentCard({ id, onOpen, onRoom }: AgentCardProps) {
  const { t } = useI18n();
  const { agentById, roomById } = useWorkspaceData();
  const a = agentById(id)!;
  const [hover, setHover] = useState(false);
  const room = roomById(a.room)!;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onOpen(a.id)}
      className="card"
      style={{ padding: '17px 18px', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s, border-color .2s', transform: hover ? 'translateY(-3px)' : 'none', boxShadow: hover ? 'var(--sh-lg)' : 'var(--sh-sm)', borderColor: hover ? 'var(--border-strong)' : 'var(--border)' }}
    >
      <div className="row between" style={{ marginBottom: 14 }}>
        <span className="row" style={{ gap: 12, minWidth: 0 }}>
          <AgentAvatar id={a.id} size={44} />
          <span style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>{a.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.role}</div>
          </span>
        </span>
        <ConfidenceRing value={a.conf} size={42} />
      </div>
      <div className="row" style={{ gap: 8, marginBottom: 13 }}>
        <StatusBadge status={a.status} sm />
        <button
          onClick={e => { e.stopPropagation(); onRoom(a.room); }}
          className="badge badge-neutral focusable"
          style={{ height: 21, fontSize: 11.5 }}
        >
          <Icon name={ROOM_ICON[a.room]} size={11} /> {room.short}
        </button>
      </div>
      <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-muted)', marginBottom: 14, minHeight: 54 }}>
        <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>{t('agents.cardCurrentTask')}</div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-2)', lineHeight: 1.4 }}>{a.task}</div>
      </div>
      <div className="row between" style={{ fontSize: 12 }}>
        {([
          [t('agents.cardTasksLabel'),   a.tasks],
          [t('agents.cardQualityLabel'), a.quality],
          [t('agents.cardCostLabel'),    '$' + a.cost.toFixed(2)],
        ] as [string, string | number][]).map(([l, v], i) => (
          <span key={i} className="col" style={{ alignItems: i === 0 ? 'flex-start' : i === 2 ? 'flex-end' : 'center', flex: 1 }}>
            <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{v}</span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{l} {t('agents.cardTodaySuffix')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Filter / sort maps — internal English keys drive logic; labels are t()-resolved
   ------------------------------------------------------------------------- */
type AgentData = Agent;

const STAT_KEYS = ['All', 'Working', 'Needs review', 'Waiting', 'Escalating', 'Idle'] as const;
const STAT: Record<string, (a: AgentData) => boolean> = {
  'All':          () => true,
  'Working':      a => a.status === 'working',
  'Needs review': a => a.status === 'review',
  'Waiting':      a => a.status === 'waiting',
  'Escalating':   a => a.status === 'escalate',
  'Idle':         a => a.status === 'idle',
};

const SORT_KEYS = ['Top quality', 'Highest confidence', 'Most tasks', 'Highest cost'] as const;
const SORT: Record<string, (a: AgentData, b: AgentData) => number> = {
  'Top quality':        (a, b) => b.quality - a.quality,
  'Highest confidence': (a, b) => b.conf - a.conf,
  'Most tasks':         (a, b) => b.tasks - a.tasks,
  'Highest cost':       (a, b) => b.cost - a.cost,
};

const STAT_I18N: Record<string, string> = {
  'All':          'agents.filterAll',
  'Working':      'agents.filterWorking',
  'Needs review': 'agents.filterNeedsReview',
  'Waiting':      'agents.filterWaiting',
  'Escalating':   'agents.filterEscalating',
  'Idle':         'agents.filterIdle',
};

const SORT_I18N: Record<string, string> = {
  'Top quality':        'agents.sortTopQuality',
  'Highest confidence': 'agents.sortHighestConf',
  'Most tasks':         'agents.sortMostTasks',
  'Highest cost':       'agents.sortHighestCost',
};

/* -------------------------------------------------------------------------
   AgentsIndex — exported screen component
   ------------------------------------------------------------------------- */
export interface AgentsIndexProps {
  onOpen: (id: string) => void;
  onRoom: (id: string) => void;
}

export function AgentsIndex({ onOpen, onRoom }: AgentsIndexProps) {
  const { t } = useI18n();
  const { agents, rooms, roomById } = useWorkspaceData();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [roomF, setRoomF] = useState('All rooms');
  const [sort, setSort] = useState('Top quality');

  let list = agents
    .filter(STAT[status])
    .filter(a => roomF === 'All rooms' || roomById(a.room)?.name === roomF)
    .filter(a => (a.name + a.role).toLowerCase().includes(q.toLowerCase()));
  list = [...list].sort(SORT[sort]);

  const avgConf = Math.round(agents.reduce((s, a) => s + a.conf, 0) / agents.length);
  const needReview = agents.filter(a => a.status === 'review' || a.status === 'escalate').length;
  const activeNow = agents.filter(a => a.status === 'working' || a.status === 'active').length;
  const tasksToday = agents.reduce((sum, a) => sum + (a.tasks ?? 0), 0);
  const aiCost = Math.round(agents.reduce((sum, a) => sum + (a.cost ?? 0), 0) * 100) / 100;

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      <div className="row between wrap" style={{ gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', marginBottom: 6 }}>{t('agents.title')}</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('agents.sub')}</p>
        </div>
      </div>
      <OverviewBand items={[
        { label: t('agents.bandTotal'),      value: agents.length,        icon: 'agents' },
        { label: t('agents.bandActiveNow'),  value: activeNow,         icon: 'activity', accent: 'var(--success)' },
        { label: t('agents.bandNeedReview'), value: needReview, icon: 'alert',   accent: 'var(--warning)' },
        { label: t('agents.bandAvgConf'),    value: avgConf,   icon: 'shield',   suffix: '%' },
        { label: t('agents.bandTasksToday'), value: tasksToday,       icon: 'check' },
        { label: t('agents.bandAiCost'),     value: aiCost,      icon: 'bolt',     accent: 'var(--warning)' },
      ]} />

      {/* filters */}
      <div className="row between wrap" style={{ gap: 12, marginBottom: 20 }}>
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <div className="row" style={{ gap: 9, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', width: 230, maxWidth: '70vw' }}>
            <Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('agents.searchPlaceholder')} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, width: '100%', color: 'var(--ink)' }} />
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {STAT_KEYS.map(f => (
              <button key={f} className={'chip' + (status === f ? ' active' : '')} onClick={() => setStatus(f)} style={{ height: 38 }}>{t(STAT_I18N[f])}</button>
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select value={roomF} onChange={e => setRoomF(e.target.value)} className="focusable" style={{ height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            <option value="All rooms">{t('agents.allRoomsOption')}</option>
            {rooms.filter(r => r.id !== 'ceo').map(r => <option key={r.id}>{r.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="focusable" style={{ height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            {SORT_KEYS.map(s => <option key={s} value={s}>{t(SORT_I18N[s])}</option>)}
          </select>
        </div>
      </div>

      {list.length === 0
        ? <EmptyState icon="agents" title={t('agents.emptyTitle')} sub={t('agents.emptySub')} />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 18 }}>
            {list.map(a => <AgentCard key={a.id} id={a.id} onOpen={onOpen} onRoom={onRoom} />)}
          </div>}
    </div>
  );
}
