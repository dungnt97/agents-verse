/* =========================================================================
   AGENTS VERSE — Floor Overview (signature spatial screen)
   Ported 1:1 from floor-overview.jsx. Wires to Next.js router/toast instead
   of window-global callbacks. No Tailwind — inline styles preserved verbatim.
   ========================================================================= */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { CountUp } from '@/components/ui/count-up';
import { Sparkline } from '@/components/ui/sparkline';
import { FloorMap, ROOM_ICON } from '@/components/floor-map';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/lib/providers/toast-provider';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { fmt, statusMap } from '@/lib/data/format';
import type { Escalation, ActivityItem } from '@/lib/data/types';

/* ---- MetricStat ---- */

interface MetricStatProps {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon: string;
  spark?: number[];
  sparkColor?: string;
  meter?: boolean;
  meterPct?: number;
  delta?: string;
  deltaUp?: boolean;
  accent?: string;
}

export function MetricStat({ label, value, decimals = 0, prefix = '', suffix = '', icon, spark, sparkColor, meter, meterPct, delta, deltaUp = true, accent }: MetricStatProps) {
  const { t } = useI18n();
  return (
    <div className="card" style={{ padding: '15px 17px', minWidth: 0 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 500 }}>{label}</span>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface-muted)', color: accent || 'var(--ink-3)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={icon} size={15} /></span>
      </div>
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 27, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1 }}>
            <CountUp end={value} decimals={decimals} prefix={prefix} suffix={suffix} />
          </div>
          {delta && <div className="row" style={{ gap: 4, marginTop: 7, fontSize: 12, color: deltaUp ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            <Icon name="arrowUR" size={12} style={{ transform: deltaUp ? 'none' : 'rotate(90deg)' }} />{delta}
          </div>}
        </div>
        {spark && <Sparkline data={spark} color={sparkColor || 'var(--primary)'} w={78} h={30} />}
        {meter && <div style={{ width: 78 }}>
          <div className="track" style={{ height: 7 }}><i style={{ width: (meterPct ?? 0) + '%', background: (meterPct ?? 0) > 80 ? 'var(--warning)' : 'var(--primary)' }} /></div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, textAlign: 'right' }}>{meterPct}{t('dash.ofLimit')}</div>
        </div>}
      </div>
    </div>
  );
}

/* ---- ActivityRow ---- */

function ActivityRow({ a }: { a: ActivityItem }) {
  const { agentById, roomById } = useWorkspaceData();
  const statusColor = ({ success: 'var(--success)', warning: 'var(--warning)', review: 'var(--warning)', info: 'var(--info)', danger: 'var(--danger)' } as Record<string, string>)[a.status] || 'var(--ink-3)';
  return (
    <div className="row" style={{ gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border-soft)', alignItems: 'flex-start' }}>
      <AgentAvatar id={a.agent} size={30} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--ink)' }}>{a.text}</div>
        <div className="row" style={{ gap: 8, marginTop: 4 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{agentById(a.agent)?.name}</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--border-strong)' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{roomById(a.room)?.short}</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--border-strong)' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{a.t}</span>
        </div>
      </div>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: statusColor, marginTop: 5, flex: 'none' }} />
    </div>
  );
}

/* ---- EscalationMini ---- */

interface EscalationMiniProps {
  e: Escalation;
  onAction: (msg: string, kind?: 'success' | 'warning' | 'danger') => void;
}

export function EscalationMini({ e, onAction }: EscalationMiniProps) {
  const { t } = useI18n();
  const sevCls = e.sev === 'high' ? 'badge-danger' : e.sev === 'medium' ? 'badge-warning' : 'badge-neutral';
  const kindIcon = ({ human: 'user', deal: 'deals', cost: 'dollar' } as Record<string, string>)[e.kind] || 'alert';
  return (
    <div style={{ padding: 14, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface-elev)', marginBottom: 10 }}>
      <div className="row between" style={{ marginBottom: 9 }}>
        <span className="row" style={{ gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--warning-soft)', color: 'var(--warning)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={kindIcon} size={16} /></span>
          <span className={'badge ' + sevCls} style={{ height: 20, fontSize: 11 }}>{e.sev} {t('dash.prioritySuffix')}</span>
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{e.time}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{e.title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 12 }}>{e.who}{e.value > 0 && ' · ' + fmt.money(e.value)}</div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary btn-sm grow" onClick={() => onAction('Approved: ' + e.title)}>{t('dash.approve')}</button>
        <button className="btn btn-ghost btn-sm grow" onClick={() => onAction('Opened review for ' + e.who, 'success')} style={{ borderColor: 'var(--border)' }}>{t('dash.review')}</button>
      </div>
    </div>
  );
}

/* ---- RoomPeek ---- */

interface RoomPeekProps {
  roomId: string;
  onClose: () => void;
  onAction: (msg: string, kind?: 'success' | 'warning' | 'danger') => void;
  goRoom?: (id: string) => void;
}

export function RoomPeek({ roomId, onClose, onAction, goRoom }: RoomPeekProps) {
  const { t } = useI18n();
  const { roomById, agents } = useWorkspaceData();
  const r = roomById(roomId);
  if (!r) return null;
  const sm = statusMap[r.status];
  const roomAgents = agents.filter(a => a.room === r.id);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,18,12,.32)', backdropFilter: 'blur(2px)', animation: 'fade-in .25s' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '92vw', zIndex: 121, background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--sh-xl)', display: 'flex', flexDirection: 'column', animation: 'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="row" style={{ gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 11, background: `color-mix(in oklab, ${sm.dot} 14%, transparent)`, color: sm.dot, display: 'grid', placeItems: 'center' }}><Icon name={ROOM_ICON[r.id]} size={20} /></span>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>{r.name}</div><StatusBadge status={r.status} sm /></div>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor: 'var(--border)' }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <p style={{ fontSize: 14.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 18 }}>{r.purpose}</p>
          <div style={{ padding: '13px 15px', borderRadius: 12, background: 'var(--primary-soft)', marginBottom: 20 }}>
            <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 6 }}>{t('dash.currentMission')}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{r.mission}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 22 }}>
            {([
              [t('dash.running'),   r.running],
              [t('dash.doneToday'), r.done],
              [t('dash.health'),    r.health + '%'],
            ] as [string, string | number][]).map(([l, v], i) => (
              <div key={i} style={{ padding: '12px', borderRadius: 11, border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }} className="tabular">{v}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{t('dash.agentsInRoom')} · {roomAgents.length}</div>
          <div className="col" style={{ gap: 8, marginBottom: 8 }}>
            {roomAgents.map(a => (
              <div key={a.id} className="row between" style={{ padding: '10px 12px', borderRadius: 11, border: '1px solid var(--border)' }}>
                <span className="row" style={{ gap: 11 }}>
                  <AgentAvatar id={a.id} size={32} />
                  <span><div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.role}</div></span>
                </span>
                <StatusBadge status={a.status} sm />
              </div>
            ))}
          </div>
        </div>
        <div className="row" style={{ gap: 10, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary grow" onClick={() => { onClose(); goRoom ? goRoom(r.id) : onAction('Opening ' + r.name + '…', 'success'); }}>{t('dash.openRoom')} <Icon name="arrowR" size={16} /></button>
          <button className="btn btn-ghost" onClick={() => onAction('Asked ' + r.name + ' for a summary')} style={{ borderColor: 'var(--border)' }}>{t('dash.askSummary')}</button>
        </div>
      </div>
    </>
  );
}

/* ---- FloorOverview ---- */

export interface FloorOverviewProps {
  escalations: Escalation[];
  activity: ActivityItem[];
}

export function FloorOverview({ escalations, activity }: FloorOverviewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const onAction = useToast();
  const goCommand = () => router.push('/command');
  const goRoom = (id: string) => router.push('/rooms/' + id);
  const [peek, setPeek] = useState<string | null>(null);
  // The greeting depends on the local hour. Computing it during render would differ between the
  // server's hour-bucket and the client's, causing a hydration mismatch on the headline — so it
  // is filled in after mount (briefly empty on first paint, like any client-only value).
  const [greet, setGreet] = useState('');
  useEffect(() => {
    const hr = new Date().getHours();
    setGreet(hr < 12 ? t('ov.greet1') : hr < 18 ? t('ov.greet2') : t('ov.greet3'));
  }, [t]);
  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      {/* header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 24 }}>
        <div>
          <div className="row" style={{ gap: 11, marginBottom: 7 }}>
            <h1 style={{ fontSize: 28, letterSpacing: '-0.03em' }}>{greet}{t('ov.founder')}</h1>
            <span className="badge badge-success" style={{ height: 24 }}><span className="pulse" style={{ background: 'var(--success)' }} /> {t('ov.running')}</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('ov.sub')}</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" style={{ borderColor: 'var(--border)' }} onClick={() => onAction('Daily briefing requested')}><Icon name="doc" size={16} /> {t('ov.briefing')}</button>
          <button className="btn btn-primary" onClick={goCommand}>{t('ov.review')} <Icon name="arrowR" size={16} /></button>
        </div>
      </div>

      {/* metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 14, marginBottom: 24 }} className="metric-strip">
        <MetricStat label={t('m.scanned')} value={148} icon="search" delta="+22 today" spark={[60, 72, 68, 90, 110, 128, 148]} accent="var(--info)" />
        <MetricStat label={t('m.leads')} value={43} icon="leads" delta="+6" spark={[20, 24, 28, 30, 36, 40, 43]} accent="var(--primary)" />
        <MetricStat label={t('m.demos')} value={12} icon="layers" delta="+4" spark={[3, 5, 6, 8, 9, 11, 12]} sparkColor="var(--violet)" accent="var(--violet)" />
        <MetricStat label={t('m.replies')} value={7} icon="activity" delta="+3" spark={[1, 2, 2, 4, 5, 6, 7]} sparkColor="var(--success)" accent="var(--success)" />
        <MetricStat label={t('m.forecast')} value={8.4} decimals={1} prefix="$" suffix="k" icon="dollar" delta="+$2.1k" spark={[3, 4, 4.5, 6, 6.8, 7.6, 8.4]} sparkColor="var(--success)" accent="var(--success)" />
        <MetricStat label={t('m.cost')} value={42.8} decimals={2} prefix="$" icon="bolt" meter meterPct={86} accent="var(--warning)" />
      </div>

      {/* main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 20, alignItems: 'start' }} className="floor-grid">
        {/* floor map panel */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="row" style={{ gap: 10 }}><h2 style={{ fontSize: 17, whiteSpace: 'nowrap' }}>{t('ov.floor')}</h2><span className="badge badge-neutral">{t('ov.live')}</span></div>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{t('ov.floorHint')}</p>
            </div>
            <div className="row" style={{ gap: 14 }}>
              <span className="row" style={{ gap: 7, fontSize: 12, color: 'var(--ink-2)' }}><span style={{ width: 18, height: 3, borderRadius: 2, background: 'var(--primary)' }} /> {t('dash.workflow')}</span>
              <span className="row" style={{ gap: 7, fontSize: 12, color: 'var(--warning)' }}><Icon name="alert" size={14} /> {t('ov.bottleneck')}</span>
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <FloorMap selected={peek ?? undefined} onRoom={setPeek} height={540} />
          </div>
        </div>

        {/* right column */}
        <div className="col" style={{ gap: 20 }}>
          {/* escalations */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <div className="row" style={{ gap: 9 }}><h2 style={{ fontSize: 16 }}>{t('ov.attention')}</h2><span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--warning)', color: '#fff', fontSize: 11.5, fontWeight: 600, display: 'grid', placeItems: 'center' }}>{escalations.length}</span></div>
              <button onClick={goCommand} style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600 }}>{t('ov.viewAll')}</button>
            </div>
            {escalations.map(e => <EscalationMini key={e.id} e={e} onAction={onAction} />)}
          </div>
          {/* activity */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="row" style={{ gap: 9 }}><h2 style={{ fontSize: 16 }}>{t('ov.activity')}</h2><span className="pulse" /></div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{t('ov.updating')}</span>
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto', marginRight: -6, paddingRight: 6 }}>
              {activity.map((a, i) => <ActivityRow key={i} a={a} />)}
            </div>
          </div>
        </div>
      </div>

      {peek && <RoomPeek roomId={peek} onClose={() => setPeek(null)} onAction={onAction} goRoom={goRoom} />}
    </div>
  );
}
