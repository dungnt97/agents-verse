'use client';
/* =========================================================================
   AGENTS VERSE — AgentDetail + FounderChat
   Agent detail view: current task, skills/tools, outputs, history,
   performance panel, and the canned-reply FounderChat widget.
   AgentDetail + FounderChat.
   ========================================================================= */

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfidenceRing } from '@/components/ui/confidence-ring';
import { useI18n } from '@/lib/i18n';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { ROOM_ICON } from '@/components/floor-map';
import { TimelineItem } from '@/components/workspace/rooms/room-detail';
import { NewSite } from '@/components/site-mock';
import type { Agent, AgentDetail as AgentDetailData } from '@/lib/data/types';
import type { ToastKind } from '@/lib/providers/toast-provider';
// Side-effect import: merges rooms.* + agents.* keys into AV_DICT
import '@/lib/i18n/keys/rooms-agents';

type OnAction = (msg: string, kind?: ToastKind) => void;

/* -------------------------------------------------------------------------
   FounderChat — canned-reply chat widget pinned to the right rail.
   Reply logic is a simple keyword matcher with 550 ms simulated delay —
   mirrors the original setTimeout rule-based reply (no streaming).
   ------------------------------------------------------------------------- */
interface ChatMessage {
  role: 'agent' | 'you';
  text: string;
}

interface FounderChatProps {
  agent: Agent;
  detail: AgentDetailData;
  onAction: OnAction;
}

// Canned responses keyed by intent.
const CANNED: Record<string, string> = {
  style:   'I chose a calm, premium direction because the client is in a trust-driven category — clean type, generous spacing, and one clear booking CTA convert better there.',
  premium: 'Understood. I’ll deepen the visual hierarchy, refine the type scale and add a more editorial hero. New version in ~2 minutes.',
  before:  'The original scored low on mobile UX and CTA clarity. My redesign fixes the hero, adds trust signals, and makes booking one tap — a +51 point lift.',
  mobile:  'Prioritizing mobile now — stacking the hero, enlarging tap targets to 48px, and moving the booking CTA above the fold.',
};

function cannedReply(text: string): string {
  const key = /style/i.test(text)
    ? 'style'
    : /premium/i.test(text)
    ? 'premium'
    : /before|after|reason/i.test(text)
    ? 'before'
    : /mobile/i.test(text)
    ? 'mobile'
    : null;
  return key
    ? CANNED[key]
    : 'Got it. I’ll factor that into the current task and flag you if it pushes confidence below the review threshold.';
}

function FounderChat({ agent, detail: d, onAction }: FounderChatProps) {
  const { t } = useI18n();
  // onAction available for future escalation from chat — not used in original but prop kept
  void onAction;

  const [msgs, setMsgs] = useState<ChatMessage[]>([{
    role: 'agent',
    // Typographic apostrophe + curly dash are intentional — preserve them exactly.
    text: `I'm on it — ${agent.task[0].toLowerCase() + agent.task.slice(1)}. Confidence ${agent.conf}%. Ask me anything or steer the work.`,
  }]);
  const [val, setVal] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message whenever msgs changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs(m => [...m, { role: 'you', text }]);
    setVal('');
    // 550 ms delay mirrors original setTimeout — rule-based, not streaming
    setTimeout(() => setMsgs(m => [...m, { role: 'agent', text: cannedReply(text) }]), 550);
  };

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div className="row" style={{ gap: 9 }}>
          <Icon name="command" size={16} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: 15 }}>{t('agents.founderControlsTitle')}</h2>
        </div>
        <span className="badge badge-success" style={{ height: 20 }}>
          <span className="pulse" style={{ background: 'var(--success)' }} /> {t('agents.founderOnline')}
        </span>
      </div>

      <div ref={scrollRef} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'you' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{
              padding: '9px 12px', borderRadius: 13, fontSize: 13, lineHeight: 1.45,
              background: m.role === 'you' ? 'var(--primary)' : 'var(--surface-muted)',
              color: m.role === 'you' ? '#fff' : 'var(--ink)',
              borderBottomRightRadius: m.role === 'you' ? 4 : 13,
              borderBottomLeftRadius: m.role === 'you' ? 13 : 4,
            }}>{m.text}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {(d?.chatPrompts ?? []).slice(0, 3).map((p, i) => (
            <button key={i} onClick={() => send(p)} className="chip" style={{ height: 28, fontSize: 11.5 }}>{p}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <input
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(val)}
            placeholder={`Message ${agent.name}…`}
            style={{ flex: 1, height: 38, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', outline: 'none' }}
          />
          <button className="btn btn-primary btn-icon" onClick={() => send(val)} title={t('agents.chatSend')}><Icon name="send" size={16} /></button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   AgentDetail — exported screen component
   ------------------------------------------------------------------------- */
export interface AgentDetailProps {
  agentId: string;
  detail: AgentDetailData | null;
  onBack: () => void;
  onRoom: (id: string) => void;
  onAction: OnAction;
}

export function AgentDetail({ agentId, detail, onBack, onRoom, onAction }: AgentDetailProps) {
  const { t } = useI18n();
  const { agentById, roomById } = useWorkspaceData();
  // Mirror original fallback: unknown id → 'nova'
  const a = (agentById(agentId) || agentById('nova'))!;
  const d = detail;
  const room = roomById(a.room)!;

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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 20, alignItems: 'start' }} className="floor-grid">
        {/* main column */}
        <div className="col" style={{ gap: 20 }}>
          {/* current task */}
          <div className="card" style={{ padding: 18 }}>
            <div className="row between" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 16 }}>{t('agents.sectionCurrentTask')}</h2>
              <ConfidenceRing value={a.conf} size={40} />
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

          {/* recent outputs — only shown when the agent has outputs */}
          {(d?.outputs.length ?? 0) > 0 && (
            <div className="card" style={{ padding: 18 }}>
              <h2 style={{ fontSize: 16, marginBottom: 14 }}>{t('agents.sectionRecentOutputs')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
                {d!.outputs.map((o, i) => (
                  <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ position: 'relative', paddingTop: '62%' }}>
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <NewSite hue={o.hue} />
                      </div>
                    </div>
                    <div style={{ padding: '10px 11px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, marginBottom: 3 }}>{o.title.split(' — ')[0]}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{o.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* task history */}
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>{t('agents.sectionTaskHistory')}</h2>
            <div>
              {(d?.history ?? []).map((e, i) => (
                <TimelineItem key={i} e={e} last={i === (d?.history.length ?? 1) - 1} />
              ))}
            </div>
          </div>
        </div>

        {/* right rail */}
        <div className="col" style={{ gap: 20 }}>
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>{t('agents.sectionPerformance')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                [t('agents.perfTasksCompleted'), a.tasks],
                [t('agents.perfAvgQuality'),     a.quality],
                [t('agents.perfApprovalRate'),   (d?.approval ?? '—') + (d ? '%' : '')],
                [t('agents.perfCostToday'),      '$' + a.cost.toFixed(2)],
              ] as [string, string | number][]).map(([l, v], i) => (
                <div key={i} style={{ padding: '13px 14px', borderRadius: 12, background: 'var(--surface-muted)' }}>
                  <div style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.02em' }} className="tabular">{v}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="row between" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{t('agents.perfEscalatesBelow')}</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{d?.escalationThreshold}{t('agents.perfConfidenceSuffix')}</span>
            </div>
          </div>

          {d && <FounderChat agent={a} detail={d} onAction={onAction} />}
        </div>
      </div>
    </div>
  );
}
