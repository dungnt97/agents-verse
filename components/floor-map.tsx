/* =========================================================================
   AGENTS VERSE — FloorMap
   Hybrid schematic floorplan: rooms as zones, a workflow path threaded
   through them (Research → Audit → Design → Code → Sales → Support → Finance),
   CEO control room overseeing from the top. Animated flowing line + packets.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { statusMap } from '@/lib/data/format';
import { Icon } from '@/components/brand/icon';
import { AvatarStack } from '@/components/ui/agent-avatar';
import type { Room } from '@/lib/data/types';

export const ROOM_ICON: Record<string, string> = { ceo:'command', research:'search', audit:'audits', design:'layers', code:'bolt', sales:'send', support:'user', finance:'dollar' };
export const WORKFLOW = ['research','audit','design','code','sales','support','finance'];

// Catmull-Rom → cubic bezier smooth path through points [{x,y}]
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export interface FloorMapProps {
  compact?: boolean;
  selected?: string;
  onRoom?: (id: string) => void;
  onAgent?: (id: string) => void;
  height?: number;
}

export function FloorMap({ compact = false, selected, onRoom, onAgent, height }: FloorMapProps) {
  const { rooms } = useWorkspaceData();
  const byId = Object.fromEntries(rooms.map(r => [r.id, r]));
  const flowPts = WORKFLOW.map(id => ({ x: byId[id].x, y: byId[id].y }));
  const pathD = smoothPath(flowPts);
  const ceo = byId.ceo, design = byId.design;

  return (
    <div style={{ position: 'relative', width: '100%', height: height || (compact ? 280 : 560),
      borderRadius: compact ? 14 : 20, overflow: 'hidden',
      background: 'radial-gradient(130% 110% at 50% -10%, var(--surface-elev), var(--surface) 60%, var(--surface-muted))',
      border: '1px solid var(--border)' }}>

      {/* floorplan grid texture */}
      <div style={{ position: 'absolute', inset: 0, opacity: compact ? 0.5 : 0.7,
        backgroundImage: 'linear-gradient(var(--border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--border-soft) 1px, transparent 1px)',
        backgroundSize: '40px 40px', WebkitMaskImage: 'radial-gradient(120% 100% at 50% 30%, #000 40%, transparent 85%)',
        maskImage: 'radial-gradient(120% 100% at 50% 30%, #000 40%, transparent 85%)' }} />

      {/* zone labels (floorplan feel) */}
      {!compact && (
        <>
          <ZoneLabel x={50} y={18} text="PRODUCTION LINE" />
          <ZoneLabel x={50} y={94} text="DELIVERY & OPERATIONS" />
        </>
      )}

      {/* workflow line SVG */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="flowgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
            <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--info)" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        {/* CEO oversight link */}
        <path d={`M ${ceo.x} ${ceo.y} L ${design.x} ${design.y}`} fill="none" stroke="var(--ink-3)" strokeWidth="1"
          strokeDasharray="2 3" vectorEffect="non-scaling-stroke" opacity="0.4" />
        {/* base */}
        <path d={pathD} fill="none" stroke="var(--border-strong)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        {/* active gradient flow */}
        <path d={pathD} fill="none" stroke="url(#flowgrad)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round"
          strokeDasharray="7 11" style={{ animation: 'flow-dash 1.4s linear infinite' }} />
        {/* moving packets */}
        {[0, 2.0, 4.0].map((delay, i) => (
          <circle key={i} r={compact ? 2.2 : 2.8} fill="var(--primary)" style={{ filter: 'drop-shadow(0 0 4px var(--primary))' }}>
            <animateMotion dur="6s" repeatCount="indefinite" begin={`${delay}s`} path={pathD} rotate="auto" />
          </circle>
        ))}
      </svg>

      {/* room nodes */}
      {rooms.map(r => (
        <RoomNode key={r.id} room={r} compact={compact} selected={selected === r.id}
          onClick={() => onRoom && onRoom(r.id)} onAgent={onAgent} />
      ))}
    </div>
  );
}

function ZoneLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <span className="eyebrow" style={{ position: 'absolute', left: x + '%', top: y + '%', transform: 'translate(-50%,-50%)',
      fontSize: 10, letterSpacing: '.22em', color: 'var(--ink-4)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>{text}</span>
  );
}

interface RoomNodeProps {
  room: Room;
  compact: boolean;
  selected: boolean;
  onClick: () => void;
  onAgent?: (id: string) => void;
}

function RoomNode({ room, compact, selected, onClick, onAgent: _onAgent }: RoomNodeProps) {
  const [hover, setHover] = useState(false);
  const sm = statusMap[room.status];
  const w = compact ? 116 : 168;
  const live = room.status === 'active';
  const attention = room.status === 'review' || room.status === 'warning';

  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="focusable"
      style={{
        position: 'absolute', left: room.x + '%', top: room.y + '%',
        transform: `translate(-50%,-50%) translateY(${hover ? -3 : 0}px)`,
        width: w, textAlign: 'left', transition: 'transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s, border-color .2s',
        background: 'var(--surface-elev)', border: `1px solid ${selected ? 'var(--primary)' : hover ? 'var(--border-strong)' : 'var(--border)'}`,
        borderRadius: compact ? 11 : 14, padding: compact ? '8px 9px' : '11px 12px',
        boxShadow: selected ? '0 0 0 3px var(--primary-soft), var(--sh-lg)' : hover ? 'var(--sh-lg)' : 'var(--sh-sm)',
        zIndex: hover || selected ? 20 : 10, cursor: 'pointer',
      }}>
      {/* top row: icon + status */}
      <div className="row between" style={{ marginBottom: compact ? 5 : 7 }}>
        <span style={{ width: compact ? 22 : 28, height: compact ? 22 : 28, borderRadius: compact ? 7 : 9, display: 'grid', placeItems: 'center',
          background: `color-mix(in oklab, ${sm.dot} 14%, transparent)`, color: sm.dot, flex: 'none' }}>
          <Icon name={ROOM_ICON[room.id]} size={compact ? 13 : 16} />
        </span>
        {live ? <span className="pulse" style={{ background: sm.dot }} />
              : <span style={{ width: 7, height: 7, borderRadius: 99, background: sm.dot }} />}
      </div>
      <div style={{ fontSize: compact ? 11.5 : 13.5, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 2 }}>
        {compact ? room.short : room.name}
      </div>
      {!compact && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.3, marginBottom: 8, minHeight: 28 }}>{room.mission}</div>
      )}
      <div className="row between" style={{ gap: 6 }}>
        <AvatarStack ids={room.agents} size={compact ? 18 : 21} max={3} />
        {!compact && (
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
            {room.running} active
          </span>
        )}
      </div>
      {attention && !compact && (
        <span style={{ position: 'absolute', top: -7, right: -7, width: 18, height: 18, borderRadius: 99, background: sm.dot,
          color: '#fff', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-sm)' }}>
          <Icon name="alert" size={11} sw={2.2} />
        </span>
      )}
    </button>
  );
}
