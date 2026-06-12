/* =========================================================================
   AGENTS VERSE — ConfidenceRing
   SVG donut ring that animates from 0 → value on mount.
   ========================================================================= */
'use client';

import { useState, useEffect } from 'react';

export interface ConfidenceRingProps {
  value: number;
  size?: number;
  sw?: number;
  label?: boolean;
}

export function ConfidenceRing({ value, size = 44, sw = 4, label }: ConfidenceRingProps) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  const col = value >= 85 ? 'var(--success)' : value >= 75 ? 'var(--warning)' : 'var(--danger)';
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(value), 120); return () => clearTimeout(t); }, [value]);
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (shown/100)*c} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      {label !== false && <span className="tabular" style={{ position: 'absolute', fontSize: size * 0.27, fontWeight: 600 }}>{value}</span>}
    </span>
  );
}
