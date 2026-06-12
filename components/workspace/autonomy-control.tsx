/* =========================================================================
   AGENTS VERSE — AutonomyControl (port of AutonomyControl from app-shell.jsx)
   Dropdown selector for the autonomy mode — reads/writes via WorkspaceStateProvider.
   Closed by clicking outside (backdrop div); opens upward (bottom: calc(100% + 8px)).
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';

/* Verbatim constant from app-shell.jsx */
export const AUTONOMY = [
  { id: 'manual',  label: 'Manual',                  short: 'Manual',           desc: 'AI suggests. You approve every action.' },
  { id: 'review',  label: 'Review before action',    short: 'Review first',     desc: 'AI prepares work. You approve anything external.' },
  { id: 'guarded', label: 'Autonomous + guardrails', short: 'Guardrailed',      desc: 'AI completes low-risk work. You approve risk.' },
  { id: 'full',    label: 'Fully autonomous',        short: 'Fully autonomous', desc: 'AI acts within rules. Escalates critical issues.' },
];

export function AutonomyControl() {
  const { mode, setMode } = useWorkspaceState();
  const [open, setOpen] = useState(false);
  const cur = AUTONOMY.find(a => a.id === mode) ?? AUTONOMY[2];
  const idx = AUTONOMY.findIndex(a => a.id === mode);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="focusable" style={{ width: '100%', textAlign: 'left',
        padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-elev)', boxShadow: 'var(--sh-xs)' }}>
        <div className="row between" style={{ marginBottom: 9 }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>Autonomy</span>
          <Icon name="chevD" size={13} style={{ color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="pulse" style={{ background: 'var(--primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{cur.short}</span>
        </div>
        <div className="row" style={{ gap: 3, marginTop: 9 }}>
          {AUTONOMY.map((a, i) => (
            <span key={a.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= idx ? 'var(--primary)' : 'var(--surface-sunk)' }} />
          ))}
        </div>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div className="card-elev" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 61, padding: 6, boxShadow: 'var(--sh-xl)' }}>
            {AUTONOMY.map(a => (
              <button key={a.id} onClick={() => { setMode(a.id); setOpen(false); }} className="focusable" style={{ width: '100%', textAlign: 'left', padding: '10px 11px', borderRadius: 9,
                background: a.id === mode ? 'var(--primary-soft)' : 'transparent' }}
                onMouseEnter={e => { if (a.id !== mode) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'; }}
                onMouseLeave={e => { if (a.id !== mode) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                <div className="row between">
                  <span style={{ fontSize: 13, fontWeight: 600, color: a.id === mode ? 'var(--primary)' : 'var(--ink)' }}>{a.label}</span>
                  {a.id === mode && <Icon name="check" size={14} style={{ color: 'var(--primary)' }} />}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.35 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
