/* =========================================================================
   AGENTS VERSE — Sparkline
   Inline SVG line chart with optional gradient fill.
   useId() supplies a stable gradient ID (identical on server + client).
   ========================================================================= */
'use client';

import { useId } from 'react';
import type { CSSProperties } from 'react';

export interface SparklineProps {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, w = 92, h = 30, color = 'var(--primary)', fill = true }: SparklineProps) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((d, i) => [ (i/(data.length-1))*w, h - ((d-min)/rng)*(h-4) - 2 ]);
  const line = pts.map((p,i) => (i?'L':'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  const gid = 'sg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' } as CSSProperties}>
      {fill && <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.4" fill={color} />
    </svg>
  );
}
