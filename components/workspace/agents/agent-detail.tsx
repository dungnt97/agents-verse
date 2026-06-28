'use client';
/* =========================================================================
   AGENTS VERSE — AgentDetail
   Agent detail view: current task, purpose, skills + enabled tools.
   (Fabricated quality/confidence, outputs, history, performance tiles and the
   canned chat were removed — no real data source.)
   ========================================================================= */

import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { useI18n } from '@/lib/i18n';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { ROOM_ICON } from '@/components/floor-map';
import type { Agent, AgentDetail as AgentDetailData } from '@/lib/data/types';
import { AGENT_BRIEFS } from '@/lib/data/agent-briefs';
import type { ToastKind } from '@/lib/providers/toast-provider';
// Side-effect import: merges rooms.* + agents.* keys into AV_DICT
import '@/lib/i18n/keys/rooms-agents';

type OnAction = (msg: string, kind?: ToastKind) => void;


/* -------------------------------------------------------------------------
   AgentDetail — exported screen component
   ------------------------------------------------------------------------- */
export interface AgentDetailProps {
  agentId: string;
  detail: AgentDetailData | null;
  /** The agent's verbatim runtime prompt rendered against a sample job (null when not renderable). */
  realPrompt?: string | null;
  onBack: () => void;
  onRoom: (id: string) => void;
  onAction: OnAction;
}

export function AgentDetail({ agentId, detail, realPrompt, onBack, onRoom, onAction }: AgentDetailProps) {
  const { t } = useI18n();
  const { agentById, roomById } = useWorkspaceData();
  // Mirror original fallback: unknown id → 'nova'
  const a = (agentById(agentId) || agentById('nova'))!;
  const d = detail;
  const room = roomById(a.room)!;
  const brief = AGENT_BRIEFS[a.id];

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      <button onClick={onBack} className="row focusable" style={{ gap: 7, fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
        <Icon name="chevR" size={14} style={{ transform: 'rotate(180deg)' }} /> {t('agents.backLink')}
      </button>

      {/* header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 24 }}>
        <div className="row" style={{ gap: 16 }}>
          <AgentAvatar id={a.id} size={64} />
          <div>
            <div className="row" style={{ gap: 11, marginBottom: 6 }}>
              <h1 style={{ fontSize: 26, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>{a.name}</h1>
              <StatusBadge status={a.status} />
            </div>
            <div className="row" style={{ gap: 9, fontSize: 14 }}>
              <span style={{ color: 'var(--ink-2)' }}>{a.role}</span>
              <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--border-strong)' }} />
              <button onClick={() => onRoom(a.room)} className="row focusable" style={{ gap: 6, color: 'var(--primary)', fontWeight: 600 }}>
                <Icon name={ROOM_ICON[a.room]} size={14} /> {room.name}
              </button>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={() => onAction('Improvement requested from ' + a.name)}><Icon name="spark" size={15} /> {t('agents.btnImproveOutput')}</button>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={() => onAction(a.name + ' reassigned')}>{t('agents.btnReassign')}</button>
          <button className="btn btn-ghost btn-sm" style={{ borderColor: 'var(--border)' }} onClick={() => onAction(a.name + ' paused', 'warning')}><Icon name="pause" size={15} /> {t('agents.btnPause')}</button>
          <button className="btn btn-soft btn-sm" onClick={() => onAction('Escalated ' + a.name, 'warning')}>{t('agents.btnEscalate')}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20, alignItems: 'start' }} className="floor-grid">
        {/* main column */}
        <div className="col" style={{ gap: 20 }}>
          {/* current task */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>{t('agents.sectionCurrentTask')}</h2>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--primary-soft)', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{a.task}</div>
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{d?.purpose}</p>
          </div>

          {/* skills + tools */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="floor-grid">
            <div className="card" style={{ padding: 18 }}>
              <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('agents.sectionSkills')}</h2>
              <div className="row wrap" style={{ gap: 8 }}>
                {(d?.skills ?? []).map(s => (
                  <span key={s} className="chip" style={{ height: 30, cursor: 'default', background: 'var(--surface-muted)' }}>{s}</span>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding: 18 }}>
              <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('agents.sectionToolsEnabled')}</h2>
              <div className="col" style={{ gap: 9 }}>
                {(d?.tools ?? []).map(tool => (
                  <div key={tool} className="row between">
                    <span className="row" style={{ gap: 10 }}>
                      <Icon name="bolt" size={14} style={{ color: 'var(--ink-3)' }} />
                      <span style={{ fontSize: 13.5 }}>{tool}</span>
                    </span>
                    {/* toggle visual — always on, mirrors source */}
                    <span style={{ width: 30, height: 18, borderRadius: 99, background: 'var(--success)', position: 'relative', flex: 'none' }}>
                      <span style={{ position: 'absolute', right: 2, top: 2, width: 14, height: 14, borderRadius: 99, background: '#fff' }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* prompt & specialty — bilingual (EN + VI), with the verbatim runtime prompt when renderable */}
          {brief && (
            <div className="card" style={{ padding: 18 }}>
              <div className="row between" style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 16 }}>Prompt &amp; specialty</h2>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{brief.source}</span>
              </div>
              <div className="col" style={{ gap: 16 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>EN · {brief.role}</div>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' }}>{brief.en}</p>
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>VI · Tiếng Việt</div>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, textWrap: 'pretty' }}>{brief.vi}</p>
                </div>
                {realPrompt && (
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                      View the real prompt (rendered against a sample job)
                    </summary>
                    <pre style={{ marginTop: 10, padding: 14, borderRadius: 10, background: 'var(--surface-muted)', fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'var(--ink-2)', maxHeight: 460 }}>{realPrompt}</pre>
                  </details>
                )}
              </div>
            </div>
          )}


        </div>

      </div>
    </div>
  );
}
