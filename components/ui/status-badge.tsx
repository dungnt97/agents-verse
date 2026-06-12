/* =========================================================================
   AGENTS VERSE — StatusBadge
   Reads statusMap from the AV singleton. Pure presentational (no hooks).
   ========================================================================= */
import { AV } from '@/lib/data';

export interface StatusBadgeProps {
  status: string;
  sm?: boolean;
}

export function StatusBadge({ status, sm }: StatusBadgeProps) {
  const m = AV.statusMap[status] || AV.statusMap.idle;
  const live = status === 'working' || status === 'active';
  return (
    <span className={'badge ' + m.cls} style={sm ? { height: 21, fontSize: 11.5 } : undefined}>
      {live ? <span className="pulse" style={{ width: 6, height: 6, background: m.dot }} /> : <span className="dot" style={{ background: m.dot }} />}
      {m.label}
    </span>
  );
}
