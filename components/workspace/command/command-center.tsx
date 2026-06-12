/* =========================================================================
   AGENTS VERSE — Founder Command Center (CEO decision screen)
   Ported 1:1 from command.jsx. Inline styles, SVG chart math, and button
   text preserved verbatim. No Tailwind — inline styles throughout.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { ConfidenceRing } from '@/components/ui/confidence-ring';
import { Sparkline } from '@/components/ui/sparkline';
import { CountUp } from '@/components/ui/count-up';
import { useI18n } from '@/lib/i18n';
import { AV } from '@/lib/data';
import type { Escalation } from '@/lib/data/types';

/* ---- Revenue vs cost chart ---- */

function RevenueCostChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rev = [3.2, 4.1, 3.8, 5.4, 6.2, 7.1, 8.4];
  const cost = [0.31, 0.38, 0.34, 0.42, 0.45, 0.4, 0.43];
  const max = 9, W = 100, H = 56;
  const bw = 9;
  return (
    <div>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 14 }}>
          <span className="row" style={{ gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--primary)' }} /> Revenue</span>
          <span className="row" style={{ gap: 6, fontSize: 12, color: 'var(--ink-2)' }}><span style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--warning)' }} /> AI cost</span>
        </div>
        <span className="badge badge-success">81% margin</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 10}`} style={{ width: '100%', height: 120, overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (<line key={i} x1="0" x2={W} y1={H - H * g} y2={H - H * g} stroke="var(--border-soft)" strokeWidth="0.4" />))}
        {days.map((d, i) => {
          const x = 6 + i * ((W - 8) / days.length);
          const rh = (rev[i] / max) * H, ch = (cost[i] / max) * H * 8;
          return (
            <g key={i}>
              <rect x={x} y={H - rh} width={bw} height={rh} rx="1.5" fill="var(--primary)" style={{ transformOrigin: `center ${H}px`, animation: `grow-bar .8s ${i * 0.07}s cubic-bezier(.2,.8,.2,1) both` }} />
              <rect x={x + bw + 1.5} y={H - ch} width={bw} height={ch} rx="1.5" fill="var(--warning)" opacity="0.85" style={{ transformOrigin: `center ${H}px`, animation: `grow-bar .8s ${i * 0.07 + 0.1}s cubic-bezier(.2,.8,.2,1) both` }} />
              <text x={x + bw} y={H + 8} fontSize="3.6" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--font-mono)">{d}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---- Full escalation card ---- */

interface EscalationCardProps {
  e: Escalation;
  onAction: (msg: string, kind?: 'success' | 'warning' | 'danger') => void;
  expanded: boolean;
  onToggle: () => void;
}

export function EscalationCard({ e, onAction, expanded, onToggle }: EscalationCardProps) {
  const sevCls = e.sev === 'high' ? 'badge-danger' : e.sev === 'medium' ? 'badge-warning' : 'badge-neutral';
  const kindIcon = ({ human: 'user', deal: 'deals', cost: 'dollar' } as Record<string, string>)[e.kind] || 'alert';
  const kindLabel = ({ human: 'Human requested', deal: 'Deal approval', cost: 'Cost warning' } as Record<string, string>)[e.kind] || 'Escalation';
  return (
    <div style={{ borderRadius: 15, border: `1px solid ${expanded ? 'var(--primary)' : 'var(--border)'}`, background: 'var(--surface-elev)', overflow: 'hidden',
      boxShadow: expanded ? '0 0 0 3px var(--primary-soft), var(--sh-md)' : 'var(--sh-sm)', transition: 'box-shadow .2s, border-color .2s' }}>
      <button onClick={onToggle} className="row between focusable" style={{ width: '100%', textAlign: 'left', padding: '16px 18px', gap: 14 }}>
        <span className="row" style={{ gap: 13, minWidth: 0 }}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--warning-soft)', color: 'var(--warning)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={kindIcon} size={20} /></span>
          <span style={{ minWidth: 0 }}>
            <span className="row" style={{ gap: 8, marginBottom: 5 }}>
              <span className={'badge ' + sevCls} style={{ height: 19, fontSize: 10.5 }}>{e.sev}</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{kindLabel}</span>
            </span>
            <span style={{ fontSize: 15, fontWeight: 600, display: 'block', lineHeight: 1.25 }}>{e.title}</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{e.who}{e.value > 0 && ' · ' + AV.fmt.money(e.value)} · {e.time}</span>
          </span>
        </span>
        <span className="row" style={{ gap: 14, flex: 'none' }}>
          <ConfidenceRing value={e.conf} size={40} />
          <Icon name="chevD" size={18} style={{ color: 'var(--ink-3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 18px 18px', animation: 'fade-in .3s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ padding: '13px 15px', borderRadius: 12, background: 'var(--surface-muted)' }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>Why this escalated</div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.45 }}>{e.reason}</p>
            </div>
            <div style={{ padding: '13px 15px', borderRadius: 12, background: 'var(--primary-soft)' }}>
              <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 7 }}>AI recommendation</div>
              <p style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.45 }}>{e.rec}</p>
            </div>
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => onAction('Approved · ' + e.who, 'success')}><Icon name="check" size={15} /> Approve</button>
            {e.kind === 'human' && <button className="btn btn-ghost btn-sm" onClick={() => onAction('Founder call scheduled with ' + e.who, 'success')} style={{ borderColor: 'var(--border)' }}><Icon name="clock" size={15} /> Schedule call</button>}
            {e.kind === 'deal' && <button className="btn btn-ghost btn-sm" onClick={() => onAction('Marked won · ' + e.who, 'success')} style={{ borderColor: 'var(--border)' }}>Mark won</button>}
            {e.kind === 'cost' && <button className="btn btn-ghost btn-sm" onClick={() => onAction("Today's budget raised by $20", 'success')} style={{ borderColor: 'var(--border)' }}>Raise budget</button>}
            <button className="btn btn-ghost btn-sm" onClick={() => onAction('You took over · ' + e.who)} style={{ borderColor: 'var(--border)' }}>Take over</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onAction('Summary requested')} style={{ borderColor: 'var(--border)' }}>Ask AI summary</button>
            <button className="btn btn-soft btn-sm" onClick={() => onAction('Dismissed · ' + e.who, 'warning')} style={{ marginLeft: 'auto' }}>Reject</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- HealthRow ---- */

function HealthRow({ label, ok = true, note }: { label: string; ok?: boolean; note: string }) {
  return (
    <div className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
      <span className="row" style={{ gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: ok ? 'var(--success)' : 'var(--warning)', boxShadow: `0 0 0 3px color-mix(in oklab, ${ok ? 'var(--success)' : 'var(--warning)'} 18%, transparent)` }} />
        <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{label}</span>
      </span>
      <span style={{ fontSize: 12, color: ok ? 'var(--ink-3)' : 'var(--warning)', fontWeight: ok ? 400 : 600 }}>{note}</span>
    </div>
  );
}

/* ---- MetricStat (local, mirrors floor-overview version) ---- */

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

function MetricStat({ label, value, decimals = 0, prefix = '', suffix = '', icon, spark, sparkColor, meter, meterPct, delta, deltaUp = true, accent }: MetricStatProps) {
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
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 6, textAlign: 'right' }}>{meterPct}% of limit</div>
        </div>}
      </div>
    </div>
  );
}

/* ---- CommandCenter ---- */

export interface CommandCenterProps {
  onAction: (msg: string, kind?: 'success' | 'warning' | 'danger') => void;
}

export function CommandCenter({ onAction }: CommandCenterProps) {
  const { t } = useI18n();
  const [exp, setExp] = useState<string | null>('e1');
  const topAgents = [...AV.agents].sort((a, b) => b.quality - a.quality).slice(0, 4);
  const recs = [
    { ic: 'user',   t: 'Call Nova Realty',    d: 'High-intent $6.4k lead asked for a human.',     act: 'Schedule' },
    { ic: 'deals',  t: 'Approve Mekong quote', d: '$5.2k — within margin, qualified buyer.',        act: 'Approve' },
    { ic: 'dollar', t: 'Extend AI budget',     d: 'Demo queue will stall at current limit.',        act: 'Raise' },
  ];
  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      {/* header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 24 }}>
        <div>
          <div className="row" style={{ gap: 11, marginBottom: 7 }}>
            <h1 style={{ fontSize: 28, letterSpacing: '-0.03em' }}>{t('cmd.title')}</h1>
            <span className="badge badge-warning" style={{ height: 24 }}><Icon name="alert" size={13} /> {t('cmd.decisions')}</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('cmd.sub')}</p>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-ghost" style={{ borderColor: 'var(--border)' }} onClick={() => onAction('Approved all safe items', 'success')}><Icon name="check" size={16} /> {t('cmd.approveAll')}</button>
          <button className="btn btn-primary" onClick={() => onAction('Daily summary generated')}>{t('cmd.askSummary')}</button>
        </div>
      </div>

      {/* executive metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginBottom: 24 }} className="metric-strip">
        <MetricStat label={t('m.forecast')} value={8.4} decimals={1} prefix="$" suffix="k" icon="dollar" delta="+$2.1k" accent="var(--success)" spark={[3, 4, 4.5, 6, 6.8, 7.6, 8.4]} sparkColor="var(--success)" />
        <MetricStat label={t('cmd.m2')} value={6940} prefix="$" icon="activity" delta="+31%" accent="var(--primary)" spark={[2, 3, 3.4, 4.6, 5.2, 6, 6.9]} />
        <MetricStat label={t('cmd.m3')} value={2} icon="deals" delta="+1" accent="var(--violet)" spark={[0, 0, 1, 1, 1, 2, 2]} sparkColor="var(--violet)" />
        <MetricStat label={t('m.cost')} value={42.8} decimals={2} prefix="$" icon="bolt" meter meterPct={86} accent="var(--warning)" />
      </div>

      {/* main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.55fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }} className="floor-grid">
        {/* escalation queue */}
        <div className="col" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 17 }}>{t('cmd.queue')}</h2>
              <div className="row" style={{ gap: 6 }}>
                {['All', 'High', 'Deals', 'Cost'].map((f, i) => (<span key={f} className={'chip' + (i === 0 ? ' active' : '')} style={{ height: 28, fontSize: 12 }}>{f}</span>))}
              </div>
            </div>
            <div className="col" style={{ gap: 12 }}>
              {AV.escalations.map(e => <EscalationCard key={e.id} e={e} onAction={onAction} expanded={exp === e.id} onToggle={() => setExp(exp === e.id ? null : e.id)} />)}
            </div>
          </div>

          {/* today's AI work summary */}
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('cmd.work')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[['Scanned', 148, 'search'], ['Demos', 12, 'layers'], ['Outreach', 38, 'send'], ['Replies', 7, 'activity']].map(([l, v, ic], i) => (
                <div key={i} style={{ padding: '14px', borderRadius: 12, background: 'var(--surface-muted)' }}>
                  <Icon name={ic as string} size={16} style={{ color: 'var(--ink-3)', marginBottom: 8 }} />
                  <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }} className="tabular">{v}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="col" style={{ gap: 20 }}>
          {/* recommended actions */}
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('cmd.recommended')}</h2>
            <div className="col" style={{ gap: 10 }}>
              {recs.map((r, i) => (
                <div key={i} className="row between" style={{ padding: '12px 13px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <span className="row" style={{ gap: 11, minWidth: 0 }}>
                    <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={r.ic} size={16} /></span>
                    <span style={{ minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.t}</div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{r.d}</div></span>
                  </span>
                  <button className="btn btn-soft btn-sm" onClick={() => onAction(r.act + ' · ' + r.t, 'success')} style={{ flex: 'none' }}>{r.act}</button>
                </div>
              ))}
            </div>
          </div>

          {/* revenue / cost */}
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('cmd.revcost')}</h2>
            <RevenueCostChart />
          </div>

          {/* system health */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 6 }}><h2 style={{ fontSize: 16 }}>{t('cmd.health')}</h2><span className="badge badge-success">{t('cmd.operational')}</span></div>
            <HealthRow label="Lead finder" note="148 scanned" />
            <HealthRow label="Demo generator" note="12 today" />
            <HealthRow label="Outreach system" note="38 prepared" />
            <HealthRow label="Deployment" note="idle" />
            <HealthRow label="Cost budget" ok={false} note="86% used" />
          </div>

          {/* agent performance */}
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('cmd.topAgents')}</h2>
            <div className="col" style={{ gap: 4 }}>
              {topAgents.map((a, i) => (
                <div key={a.id} className="row between" style={{ padding: '8px 0', borderBottom: i < topAgents.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <span className="row" style={{ gap: 11 }}>
                    <AgentAvatar id={a.id} size={30} />
                    <span><div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.role.replace(' Agent', '')}</div></span>
                  </span>
                  <span className="row" style={{ gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{a.quality}</span>
                    <div className="track" style={{ width: 54, height: 6 }}><i style={{ width: a.quality + '%' }} /></div>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
