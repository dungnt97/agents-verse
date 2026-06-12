'use client';
/* =========================================================================
   AGENTS VERSE — RoomDetail + DemoPeek
   Room detail view: metrics strip, project cards, agent list, timeline.
   DemoPeek is a slide-in drawer for before/after site preview.
   Ported verbatim from rooms.jsx (RoomDetail, ProjectCard, TimelineItem, DemoPeek).
   ========================================================================= */

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { SiteMock } from '@/components/site-mock';
import { AV } from '@/lib/data';
import { ROOM_ICON } from '@/components/floor-map';
import { EmptyState } from './rooms-index';
import type { RoomProject, TimelineItem as TLItem } from '@/lib/data/types';
import type { ToastKind } from '@/lib/providers/toast-provider';

type OnAction = (msg: string, kind?: ToastKind) => void;

/* -------------------------------------------------------------------------
   ProjectCard — single project row inside the room's work panel
   ------------------------------------------------------------------------- */
function ProjectCard({ p, onAction, onPreview }: { p: RoomProject; onAction: OnAction; onPreview: (p: RoomProject) => void }) {
  const hue = ({ Healthcare: 200, Wellness: 300, Hospitality: 140, 'Real Estate': 40, Logistics: 230, Fitness: 20 } as Record<string, number>)[p.industry] || 220;
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <span className="row" style={{ gap: 11, minWidth: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: `oklch(0.62 0.14 ${hue})`, flex: 'none' }} />
          <span style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.company}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.industry} · {p.city}</div>
          </span>
        </span>
        <span className={'badge ' + p.cls}>{p.label}</span>
      </div>
      <div className="row between" style={{ marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Progress</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{p.progress}%</span>
      </div>
      <div className="track" style={{ marginBottom: 14 }}><i style={{ width: p.progress + '%', background: p.progress === 100 ? 'var(--success)' : 'var(--primary)' }} /></div>
      <div className="row between">
        <span className="row" style={{ gap: 9 }}>
          <AgentAvatar id={p.agent} size={26} />
          <span>
            <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Lead · confidence</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{AV.agentById(p.agent)?.name} · {p.score}%</div>
          </span>
        </span>
        <button className="btn btn-soft btn-sm" onClick={() => onPreview(p)}>Preview</button>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-soft)' }}>
        <Icon name="arrowR" size={14} style={{ color: 'var(--primary)' }} /><span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Next: {p.next}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   TimelineItem — single event row in the room/agent timeline
   Exported so AgentDetail can reuse it.
   ------------------------------------------------------------------------- */
export function TimelineItem({ e, last }: { e: TLItem; last: boolean }) {
  const col = ({ success: 'var(--success)', warning: 'var(--warning)', review: 'var(--warning)', info: 'var(--info)' } as Record<string, string>)[e.status] || 'var(--ink-3)';
  return (
    <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
      <div className="col center" style={{ flex: 'none', alignSelf: 'stretch' }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: col, marginTop: 5, boxShadow: `0 0 0 3px color-mix(in oklab,${col} 18%,transparent)` }} />
        {!last && <span style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4 }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 18, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>{e.event}</div>
        <div className="row" style={{ gap: 7, marginTop: 4 }}>
          {e.agent && (
            <><AgentAvatar id={e.agent} size={18} /><span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{AV.agentById(e.agent)?.name}</span><span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--border-strong)' }} /></>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.t} ago</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   DemoPeek — slide-in drawer showing before/after for a project
   Exported so it can be rendered by RoomDetail at page level.
   ------------------------------------------------------------------------- */
export function DemoPeek({ p, onClose, onAction }: { p: RoomProject; onClose: () => void; onAction: OnAction }) {
  const hue = ({ Healthcare: 200, Wellness: 300, Hospitality: 140, 'Real Estate': 40, Logistics: 230, Fitness: 20 } as Record<string, number>)[p.industry] || 220;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(20,18,12,.4)', backdropFilter: 'blur(2px)', animation: 'fade-in .25s' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 560, maxWidth: '94vw', zIndex: 121, background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--sh-xl)', display: 'flex', flexDirection: 'column', animation: 'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{p.company}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{p.industry} · {p.city}</div>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor: 'var(--border)' }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div className="row between" style={{ marginBottom: 10 }}><span className="eyebrow" style={{ color: 'var(--ink-3)' }}>Before</span><span className="badge badge-danger">{p.site}/100</span></div>
          <SiteMock variant="old" hue={hue} label={p.url} style={{ marginBottom: 22 }} />
          <div className="row between" style={{ marginBottom: 10 }}><span className="eyebrow" style={{ color: 'var(--primary)' }}>After · Agents Verse demo</span><span className="badge badge-success">{p.score}/100</span></div>
          <SiteMock variant="new" hue={hue} label="demo.agentsverse.ai" />
        </div>
        <div className="row" style={{ gap: 10, padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-primary grow" onClick={() => onAction('Demo approved · ' + p.company, 'success')}>Approve demo</button>
          <button className="btn btn-ghost" style={{ borderColor: 'var(--border)' }} onClick={() => onAction('Improvement requested')}>Improve with AI</button>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------
   RoomDetail — exported screen component
   ------------------------------------------------------------------------- */
export interface RoomDetailProps {
  roomId: string;
  onBack: () => void;
  onAgent: (id: string) => void;
  onAction: OnAction;
  goDemos: () => void;
}

export function RoomDetail({ roomId, onBack, onAgent, onAction, goDemos }: RoomDetailProps) {
  // Mirror original fallback: unknown id → 'design'
  const r = AV.roomById(roomId) || AV.roomById('design')!;
  const sm = AV.statusMap[r.status];
  const projects = AV.roomProjects(r.id);
  const timeline = AV.roomTimeline(r.id);
  const metrics = AV.roomMetrics(r.id);
  const agents = AV.agents.filter(a => a.room === r.id);
  const [preview, setPreview] = useState<RoomProject | null>(null);

  const workTitle = r.id === 'design' ? 'Current projects' : r.id === 'audit' ? 'Audit queue' : r.id === 'sales' ? 'Active deals' : 'Current work';

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      <button onClick={onBack} className="row focusable" style={{ gap: 7, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
        <Icon name="chevR" size={14} style={{ transform: 'rotate(180deg)' }} /> All rooms
      </button>

      {/* header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 24 }}>
        <div className="row" style={{ gap: 15 }}>
          <span style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', background: `color-mix(in oklab, ${sm.dot} 13%, transparent)`, color: sm.dot, flex: 'none' }}>
            <Icon name={ROOM_ICON[r.id]} size={26} />
          </span>
          <div>
            <div className="row" style={{ gap: 11, marginBottom: 5 }}>
              <h1 style={{ fontSize: 26, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{r.name}</h1>
              <StatusBadge status={r.status} />
            </div>
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', maxWidth: 560, textWrap: 'pretty' } as React.CSSProperties}>{r.purpose}</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={() => onAction('Asked ' + r.name + ' for a summary')}><Icon name="spark" size={15} /> Ask summary</button>
          {r.id === 'design' && <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={goDemos}>Open demos</button>}
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={() => onAction(r.name + ' paused', 'warning')}><Icon name="pause" size={15} /> Pause room</button>
          <button className="btn btn-soft btn-sm" onClick={() => onAction('Escalated an issue in ' + r.name, 'warning')}>Escalate</button>
        </div>
      </div>

      {/* metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginBottom: 24 }} className="metric-strip">
        {metrics.map(([l, v], i) => (
          <div key={i} className="card" style={{ padding: '15px 17px' }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 9 }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, alignItems: 'start' }} className="floor-grid">
        {/* main column */}
        <div className="col" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <div className="row" style={{ gap: 9 }}>
                <h2 style={{ fontSize: 17 }}>{workTitle}</h2>
                <span className="badge badge-neutral">{projects.length}</span>
              </div>
              <button className="btn btn-soft btn-sm" onClick={() => onAction('Prioritization updated')}>Prioritize</button>
            </div>
            {projects.length === 0
              ? <EmptyState icon="layers" title="Nothing in progress" sub="This room has no active work right now. New tasks will appear here automatically." />
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
                  {projects.map(p => <ProjectCard key={p.id} p={p} onAction={onAction} onPreview={setPreview} />)}
                </div>}
          </div>
        </div>

        {/* right rail */}
        <div className="col" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>Agents in room</h2>
              <span className="badge badge-neutral">{agents.length}</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => onAgent(a.id)}
                  className="row between focusable"
                  style={{ width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 11, border: '1px solid var(--border)', transition: '.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span className="row" style={{ gap: 11 }}>
                    <AgentAvatar id={a.id} size={32} />
                    <span>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{a.role.replace(' Agent', '')}</div>
                    </span>
                  </span>
                  <StatusBadge status={a.status} sm />
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16 }}>Room timeline</h2>
              <span className="pulse" />
            </div>
            <div>{timeline.map((e, i) => <TimelineItem key={i} e={e} last={i === timeline.length - 1} />)}</div>
          </div>
        </div>
      </div>

      {preview && <DemoPeek p={preview} onClose={() => setPreview(null)} onAction={onAction} />}
    </div>
  );
}
