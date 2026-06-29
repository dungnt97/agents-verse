/* =========================================================================
   AGENTS VERSE — TopBar
   Breadcrumbs from pathname + ROUTE_META, ⌘K search button, review bell,
   LangToggle, ThemeToggle, mobile menu button.
   Breadcrumb logic: split pathname into segments, map each to ROUTE_META
   label; for detail segments (rooms/[id], agents/[id]) resolve entity name
   via AV helpers where available.
   ========================================================================= */
'use client';

import { usePathname } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { LangToggle } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useI18n } from '@/lib/i18n';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { ROUTE_META } from './route-meta';
import { AUTONOMY } from './autonomy-control';
import type { Room, Agent } from '@/lib/data/types';

interface CrumbDirectory {
  roomById: (id: string) => Room | undefined;
  agentById: (id: string) => Agent | undefined;
}

/* Build breadcrumb label array from a pathname like /rooms/design.
   Rule: first crumb is always "Agents Verse"; subsequent crumbs come from
   ROUTE_META; dynamic [id] segments resolve to entity name if available. */
function buildCrumbs(pathname: string, t: (k: string) => string, dir: CrumbDirectory): string[] {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return ['Agents Verse'];

  const crumbs: string[] = ['Agents Verse'];
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    const meta = ROUTE_META[seg];
    if (meta) {
      // Route labels are localized via the existing app.* keys (sidebar nav uses the same);
      // fall back to the English ROUTE_META label if a key is missing.
      const k = 'app.' + seg;
      const tr = t(k);
      crumbs.push(tr !== k ? tr : meta.label);
    } else {
      // Attempt to resolve dynamic [id] segments using AV data helpers
      const parent = parts[i - 1];
      if (parent === 'rooms') {
        const room = dir.roomById(seg);
        if (room) { crumbs.push(room.name); continue; }
      }
      if (parent === 'agents') {
        const agent = dir.agentById(seg);
        if (agent) { crumbs.push(agent.name); continue; }
      }
      // Fallback: capitalise the raw segment
      crumbs.push(seg.charAt(0).toUpperCase() + seg.slice(1));
    }
  }
  return crumbs;
}

interface TopBarProps {
  hasAlerts?: boolean;
  onSearch: () => void;
  onReview: () => void;
  onMenu: () => void;
}

export function TopBar({ onSearch, onReview, onMenu, hasAlerts }: TopBarProps) {
  const { t } = useI18n();
  const { mode } = useWorkspaceState();
  const { roomById, agentById } = useWorkspaceData();
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname, t, { roomById, agentById });
  /* cur — available for future use */
  const _cur = AUTONOMY.find(a => a.id === mode);

  return (
    <div style={{ height: 'var(--shell-top)', flex: 'none', borderBottom: '1px solid var(--border)', background: 'color-mix(in oklab, var(--bg) 78%, transparent)',
      backdropFilter: 'saturate(180%) blur(12px)', position: 'sticky', top: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
      <div className="row" style={{ gap: 8, fontSize: 14 }}>
        <button className="btn btn-icon btn-ghost focusable av-topbar-menu" onClick={onMenu} aria-label="Menu" style={{ borderColor: 'var(--border)', marginRight: 4 }}>
          <Icon name="menu" size={18} />
        </button>
        {crumbs.map((c, i) => (
          <span key={i} className="row" style={{ gap: 8 }}>
            {i > 0 && <Icon name="chevR" size={14} style={{ color: 'var(--ink-4)' }} />}
            <span style={{ color: i === crumbs.length - 1 ? 'var(--ink)' : 'var(--ink-3)', fontWeight: i === crumbs.length - 1 ? 600 : 500 }}>{c}</span>
          </span>
        ))}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <button onClick={onSearch} className="row focusable" style={{ gap: 10, height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink-3)' }}>
          <Icon name="search" size={15} />
          <span style={{ fontSize: 13 }} className="hide-mobile">{t('app.search')}</span>
          <span className="mono hide-mobile" style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>⌘K</span>
        </button>
        <LangToggle />
        <button onClick={onReview} className="btn btn-icon btn-ghost focusable" style={{ borderColor: 'var(--border)', position: 'relative' }} aria-label="Reviews">
          <Icon name="bell" size={17} />
          {hasAlerts && <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 99, background: 'var(--warning)', border: '2px solid var(--surface)' }} />}
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
