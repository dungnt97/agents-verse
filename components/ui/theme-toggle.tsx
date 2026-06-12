/* =========================================================================
   AGENTS VERSE — ThemeToggle
   Reads theme state from the shared ThemeProvider (Phase 1).
   ========================================================================= */
'use client';

import { useTheme } from '@/lib/providers/theme-provider';
import { Icon } from '@/components/brand/icon';

export interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact: _compact }: ThemeToggleProps) {
  const [theme, onToggle] = useTheme();
  return (
    <button className="btn btn-icon btn-ghost focusable" onClick={onToggle} aria-label="Toggle theme"
      style={{ borderColor: 'var(--border)' }}>
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
    </button>
  );
}
