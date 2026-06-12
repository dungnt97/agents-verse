/* =========================================================================
   AGENTS VERSE — Full logo: mark tile + wordmark
   Pure presentational aside from Mark (which is 'use client').
   ========================================================================= */
import { Mark } from './mark';

export interface LogoProps {
  size?: number;
  mono?: boolean;
}

export function Logo({ size = 28, mono = false }: LogoProps) {
  return (
    <span className="row" style={{ gap: 10 }}>
      <Mark size={size} tile />
      {!mono && (
        <span style={{ fontSize: size * 0.6, letterSpacing: '-0.03em', fontWeight: 600, color: 'var(--ink)' }}>
          Agents<span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>Verse</span>
        </span>
      )}
    </span>
  );
}
