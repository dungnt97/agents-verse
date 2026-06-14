/* =========================================================================
   AGENTS VERSE — AgentAvatar + AvatarStack
   Abstract geometric identity tiles — no robot clichés.
   Resolves agent identity from the workspace data directory (server-seeded
   context) so a bare id is enough, as before.
   ========================================================================= */
'use client';

import { statusMap } from '@/lib/data/format';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';

export interface AgentAvatarProps {
  id: string;
  size?: number;
  ring?: boolean;
}

export function AgentAvatar({ id, size = 36, ring }: AgentAvatarProps) {
  const { agentById } = useWorkspaceData();
  const a = agentById(id) || { name: '?', hue: 220, status: 'idle' };
  const h = a.hue;
  const sm = statusMap[a.status];
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <span style={{
        width: size, height: size, borderRadius: '32%', display: 'grid', placeItems: 'center',
        background: `linear-gradient(145deg, oklch(0.68 0.13 ${h}), oklch(0.5 0.16 ${h}))`,
        color: '#fff', fontWeight: 600, fontSize: size * 0.4, letterSpacing: '-0.02em',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 1px 3px oklch(0.4 0.12 ${h} / .4)`,
        border: ring ? '2px solid var(--surface)' : 'none',
      }}>{a.name[0]}</span>
      {(a.status === 'working' || a.status === 'active') && (
        <span style={{ position: 'absolute', right: -1, bottom: -1, width: size * 0.28, height: size * 0.28, minWidth: 9, minHeight: 9,
          borderRadius: 99, background: sm.dot, border: '2px solid var(--surface)' }} />
      )}
    </span>
  );
}

export interface AvatarStackProps {
  ids: string[];
  size?: number;
  max?: number;
}

export function AvatarStack({ ids, size = 26, max = 4 }: AvatarStackProps) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <span className="row" style={{ paddingLeft: 6 }}>
      {shown.map((id, i) => (
        <span key={id} style={{ marginLeft: -6, zIndex: shown.length - i }}><AgentAvatar id={id} size={size} ring /></span>
      ))}
      {extra > 0 && (
        <span style={{ marginLeft: -6, width: size, height: size, borderRadius: '32%', background: 'var(--surface-muted)',
          border: '2px solid var(--surface)', display: 'grid', placeItems: 'center', fontSize: size * 0.36, fontWeight: 600, color: 'var(--ink-2)' }}>
          +{extra}
        </span>
      )}
    </span>
  );
}
