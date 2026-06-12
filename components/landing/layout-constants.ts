/* =========================================================================
   AGENTS VERSE — Shared layout constants for landing + section components.
   The `wrap` style centres content and applies side padding, matching the
   original prototype's top-level layout constraint.
   ========================================================================= */
import type { CSSProperties } from 'react';

/** Max-width centred container with horizontal padding — used by every section. */
export const wrap: CSSProperties = {
  maxWidth: 'var(--maxw)',
  margin: '0 auto',
  padding: '0 28px',
};
