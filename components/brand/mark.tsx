/* =========================================================================
   AGENTS VERSE — Monogram mark
   Bold rounded "A" with a node at apex, standing on a floor line.
   useId() supplies a stable gradient ID (identical on server + client) so the
   gradient reference never causes a hydration mismatch.
   ========================================================================= */
'use client';

import { useId } from 'react';
import type { CSSProperties } from 'react';

export interface MarkProps {
  size?: number;
  tile?: boolean;
  stroke?: string;
}

export function Mark({ size = 24, tile = false, stroke }: MarkProps) {
  const gid = 'mk' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = stroke || (tile ? '#fff' : `url(#${gid})`);
  const glyph = (
    <>
      <defs>
        <linearGradient id={gid} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#f8972f" />
          <stop offset="100%" stopColor="#e85f17" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={s} strokeWidth="2.95" strokeLinecap="round" strokeLinejoin="round">
        {/* bold rounded A peak */}
        <path d="M5.6 19.4 L12 4.8 L18.4 19.4" />
        {/* crossbar */}
        <path d="M8.5 13.7 L15.5 13.7" />
      </g>
    </>
  );
  if (tile) {
    return (
      <span style={{
        width: size, height: size, borderRadius: size * 0.28, display: 'inline-grid', placeItems: 'center',
        background: 'linear-gradient(155deg, #f8972f, #e85f17)',
        boxShadow: '0 2px 7px rgba(232,99,28,.4), inset 0 1px 0 rgba(255,255,255,.32)', flex: 'none',
      } as CSSProperties}>
        <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24">{glyph}</svg>
      </span>
    );
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flex: 'none' }}>{glyph}</svg>;
}
