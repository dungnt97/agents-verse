'use client';
/* =========================================================================
   AGENTS VERSE — RoomsIndex
   Grid of all rooms with filter/sort bar and overview metrics band.
   RoomsIndex + helpers.
   ========================================================================= */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { AvatarStack } from '@/components/ui/agent-avatar';
import { CountUp } from '@/components/ui/count-up';
import { useI18n } from '@/lib/i18n';
import { statusMap } from '@/lib/data/format';
import type { Room, Metrics } from '@/lib/data/types';
import { ROOM_ICON } from '@/components/floor-map';
// Side-effect import: merges rooms.* + agents.* keys into AV_DICT
import '@/lib/i18n/keys/rooms-agents';

/* -------------------------------------------------------------------------
   OverviewBand — metrics row across the top of an index screen
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
   FilterBar — search input + filter chips + optional sort dropdown
   ------------------------------------------------------------------------- */
interface FilterChip {
  key: string;
  label: string;
}

interface FilterBarProps {
  q: string;
  setQ: (v: string) => void;
  filters: FilterChip[];
  active: string;
  setActive: (v: string) => void;
  sorts?: FilterChip[];
  sort?: string;
  setSort?: (v: string) => void;
  placeholder: string;
  sortLabel: string;
}

function FilterBar({ q, setQ, filters, active, setActive, sorts, sort, setSort, placeholder, sortLabel }: FilterBarProps) {
  return (
    <div className="row between wrap" style={{ gap: 12, marginBottom: 20 }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <div className="row" style={{ gap: 9, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', width: 260, maxWidth: '70vw' }}>
          <Icon name="search" size={16} style={{ color: 'var(--ink-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, width: '100%', color: 'var(--ink)' }} />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {filters.map(f => (<button key={f.key} className={'chip' + (active === f.key ? ' active' : '')} onClick={() => setActive(f.key)} style={{ height: 38 }}>{f.label}</button>))}
        </div>
      </div>
      {sorts && (
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{sortLabel}</span>
          <select value={sort} onChange={e => setSort?.(e.target.value)} className="focusable" style={{ height: 38, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>
            {sorts.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   EmptyState — shown when no cards match the active filters
   ------------------------------------------------------------------------- */
export function EmptyState({ icon, title, sub, action }: { icon: string; title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="col center" style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border-strong)', borderRadius: 16, background: 'var(--surface)' }}>
      <span style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--surface-muted)', color: 'var(--ink-3)', marginBottom: 16 }}><Icon name={icon} size={24} /></span>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: 14, color: 'var(--ink-3)', maxWidth: 340, lineHeight: 1.45 }}>{sub}</p>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------
   RoomCard — single room tile in the grid
   ------------------------------------------------------------------------- */
interface RoomCardProps {
  room: Room;
  onOpen: (id: string) => void;
  onAgent: (id: string) => void;
}

function RoomCard({ room, onOpen, onAgent }: RoomCardProps) {
  const { t } = useI18n();
  const [hover, setHover] = useState(false);
  const sm = statusMap[room.status];
  const attention = room.status === 'review' || room.status === 'warning';
  // onAgent prop is threaded through for future use (e.g. clicking agent avatars)
  void onAgent;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="card"
      style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s, box-shadow .2s, border-color .2s', transform: hover ? 'translateY(-3px)' : 'none', boxShadow: hover ? 'var(--sh-lg)' : 'var(--sh-sm)', borderColor: hover ? 'var(--border-strong)' : 'var(--border)' }}
      onClick={() => onOpen(room.id)}
    >
      <div style={{ height: 3, background: sm.dot, opacity: attention ? 1 : 0.5 }} />
      <div style={{ padding: '17px 18px' }}>
        <div className="row between" style={{ marginBottom: 13 }}>
          <span className="row" style={{ gap: 11 }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: `color-mix(in oklab, ${sm.dot} 13%, transparent)`, color: sm.dot, flex: 'none' }}><Icon name={ROOM_ICON[room.id]} size={19} /></span>
            <span style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name}</div>
              <div className="row" style={{ gap: 6, marginTop: 3 }}>
                {(room.status === 'active') ? <span className="pulse" style={{ background: sm.dot }} /> : <span style={{ width: 6, height: 6, borderRadius: 99, background: sm.dot }} />}
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{t('status.' + room.status)}</span>
              </div>
            </span>
          </span>
          <Icon name="chevR" size={17} style={{ color: hover ? 'var(--primary)' : 'var(--ink-4)', transition: '.2s' }} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 14, minHeight: 38, textWrap: 'pretty' } as React.CSSProperties}>{room.purpose}</p>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: attention ? 'var(--warning-soft)' : 'var(--surface-muted)', marginBottom: 14 }}>
          <div className="eyebrow" style={{ fontSize: 9.5, marginBottom: 4, color: attention ? 'var(--warning)' : 'var(--ink-3)' }}>{t('rooms.cardMissionLabel')}</div>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: attention ? 'var(--ink)' : 'var(--ink-2)' }}>{room.mission}</div>
        </div>
        <div className="row between">
          <AvatarStack ids={room.agents} size={24} max={4} />
          <div className="row" style={{ gap: 14 }}>
            <span title="Running"><span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{room.running}</span><span style={{ fontSize: 10.5, color: 'var(--ink-3)', marginLeft: 4 }}>{t('rooms.cardRunningLabel')}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Sort helpers — attention rank mirrors original attRank()
   ------------------------------------------------------------------------- */
function attRank(r: Room): number {
  return r.status === 'warning' ? 3 : r.status === 'review' ? 2 : r.status === 'active' ? 1 : 0;
}

// Internal keys (English) used for filter/sort logic — labels are t()-resolved in the component
const FILT_KEYS = ['All', 'Active', 'Needs review', 'Warning', 'Idle'] as const;
const FILT: Record<string, (r: Room) => boolean> = {
  'All':          () => true,
  'Active':       r => r.status === 'active',
  'Needs review': r => r.status === 'review',
  'Warning':      r => r.status === 'warning',
  'Idle':         r => r.status === 'idle',
};

const SORT_KEYS = ['Needs attention', 'Most active'] as const;
const SORT: Record<string, (a: Room, b: Room) => number> = {
  'Needs attention': (a, b) => attRank(b) - attRank(a),
  'Most active':     (a, b) => b.running - a.running,
};

// Maps internal English key → i18n translation key
const FILT_I18N: Record<string, string> = {
  'All':          'rooms.filterAll',
  'Active':       'rooms.filterActive',
  'Needs review': 'rooms.filterNeedsReview',
  'Warning':      'rooms.filterWarning',
  'Idle':         'rooms.filterIdle',
};

const SORT_I18N: Record<string, string> = {
  'Needs attention': 'rooms.sortNeedsAttention',
  'Most active':     'rooms.sortMostActive',
};

/* -------------------------------------------------------------------------
   RoomsIndex — exported screen component
   Receives pre-fetched rooms from the Server Component page.
   Router is wired internally since the page no longer needs 'use client'.
   ------------------------------------------------------------------------- */
export interface RoomsIndexProps {
  rooms: Room[];
  metrics: Metrics;
}

export function RoomsIndex({ rooms: allRooms, metrics }: RoomsIndexProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [active, setActive] = useState('All');
  const [sort, setSort] = useState('Needs attention');

  let rooms = allRooms.filter(FILT[active]).filter(r => (r.name + r.purpose).toLowerCase().includes(q.toLowerCase()));
  rooms = [...rooms].sort(SORT[sort]);

  const activeCount = allRooms.filter(r => r.status === 'active').length;
  const attn = allRooms.filter(r => r.status === 'review' || r.status === 'warning').length;

  const filterChips = FILT_KEYS.map(k => ({ key: k, label: t(FILT_I18N[k]) }));
  const sortChips   = SORT_KEYS.map(k => ({ key: k, label: t(SORT_I18N[k]) }));

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      <div className="row between wrap" style={{ gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', marginBottom: 6 }}>{t('rooms.title')}</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('rooms.sub')}</p>
        </div>
      </div>
      <OverviewBand items={[
        { label: t('rooms.bandTotal'),        value: allRooms.length,          icon: 'rooms' },
        { label: t('rooms.bandActive'),        value: activeCount, icon: 'activity', accent: 'var(--success)' },
        { label: t('rooms.bandNeedReview'),    value: attn,        icon: 'alert',    accent: 'var(--warning)' },
        { label: t('rooms.bandAgentsOnline'),  value: metrics.online,          icon: 'agents' },
        { label: t('rooms.bandTasksRunning'),  value: metrics.inProgress,          icon: 'bolt' },
        { label: t('rooms.bandDoneToday'),     value: metrics.completed,         icon: 'check' },
      ]} />
      <FilterBar
        q={q} setQ={setQ}
        filters={filterChips} active={active} setActive={setActive}
        sorts={sortChips} sort={sort} setSort={setSort}
        placeholder={t('rooms.searchPlaceholder')}
        sortLabel={t('rooms.sortLabel')}
      />
      {rooms.length === 0
        ? <EmptyState icon="rooms" title={t('rooms.emptyTitle')} sub={`${t('rooms.emptySubPrefix')}${q || active}${t('rooms.emptySubSuffix')}`} />
        : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 18 }}>
            {rooms.map(r => <RoomCard key={r.id} room={r} onOpen={id => router.push('/rooms/' + id)} onAgent={id => router.push('/agents/' + id)} />)}
          </div>}
    </div>
  );
}
