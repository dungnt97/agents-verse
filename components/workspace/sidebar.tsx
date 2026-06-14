/* =========================================================================
   AGENTS VERSE — Sidebar
   NAV tree + AutonomyControl + user/logout footer.
   Active route derived from usePathname(); detail routes (rooms/[id],
   agents/[id]) map to their index (rooms / agents) for active-state parity.
   ========================================================================= */
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { Logo } from '@/components/brand/logo';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/providers/auth-provider';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import { AutonomyControl } from './autonomy-control';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  live?: boolean;
  badge?: number;
}

interface NavGroup {
  group: string | null;
  items: NavItem[];
}

/* NAV tree constant */
const NAV: NavGroup[] = [
  { group: null, items: [
    { id: 'overview', label: 'Overview',       icon: 'overview', live: true },
    { id: 'command',  label: 'Command Center', icon: 'command',  live: true, badge: 3 },
  ]},
  { group: 'Workspace', items: [
    { id: 'rooms',  label: 'Rooms',  icon: 'rooms' },
    { id: 'agents', label: 'Agents', icon: 'agents' },
  ]},
  { group: 'Pipeline', items: [
    { id: 'requests', label: 'Demo requests', icon: 'send' },
    { id: 'leads',    label: 'Leads',         icon: 'leads' },
    { id: 'audits',   label: 'Audits',        icon: 'audits' },
    { id: 'demos',    label: 'Demos',         icon: 'demos' },
    { id: 'deals',    label: 'Deals',         icon: 'deals' },
  ]},
  { group: 'System', items: [
    { id: 'activity', label: 'Activity', icon: 'activity' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ]},
];

/* Maps detail-route segments to their index route for active-state highlight:
   route==='room' → 'rooms', route==='agent' → 'agents'. */
function activeRouteFromPathname(pathname: string): string {
  const seg = pathname.split('/')[1] ?? '';
  if (seg === 'rooms') return 'rooms';
  if (seg === 'agents') return 'agents';
  return seg;
}

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const { badges } = useWorkspaceState();
  const router = useRouter();
  const pathname = usePathname();
  const activeRoute = activeRouteFromPathname(pathname);

  function onNav(id: string) {
    router.push('/' + id);
    onClose();
  }

  function onLanding() {
    router.push('/');
  }

  function onLogout() {
    logout();
    router.push('/');
  }

  return (
    <aside className={'av-sidebar' + (mobileOpen ? ' open' : '')} style={{ width: 'var(--shell-side)', flex: 'none', borderRight: '1px solid var(--border)', background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '18px 16px 14px' }}><Logo size={26} /></div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 12px' }}>
        {NAV.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 14 }}>
            {g.group && (
              <div className="eyebrow" style={{ fontSize: 10, padding: '0 10px 8px' }}>
                {t('app.' + g.group.toLowerCase())}
              </div>
            )}
            <div className="col" style={{ gap: 1 }}>
              {g.items.map(it => {
                const active = activeRoute === it.id;
                const badge = badges[it.id as keyof typeof badges] != null
                  ? badges[it.id as keyof typeof badges]
                  : it.badge;
                return (
                  <button key={it.id} onClick={() => onNav(it.id)} className="row between focusable" style={{
                    padding: '8px 10px', borderRadius: 9, textAlign: 'left', width: '100%', position: 'relative',
                    background: active ? 'var(--primary-soft)' : 'transparent', transition: 'background .15s' }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                    <span className="row" style={{ gap: 11 }}>
                      <Icon name={it.icon} size={18} style={{ color: active ? 'var(--primary)' : 'var(--ink-3)' }} />
                      <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? 'var(--primary)' : 'var(--ink)' }}>
                        {t('app.' + it.id) || it.label}
                      </span>
                    </span>
                    {badge && (
                      <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99, background: 'var(--warning)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'grid', placeItems: 'center' }}>
                        {badge}
                      </span>
                    )}
                    {!it.live && !badge && (
                      <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--border-strong)' }} title="Coming next" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <AutonomyControl />
        <button onClick={onLanding} className="row focusable" style={{ gap: 11, width: '100%', padding: '9px 10px', borderRadius: 9, marginTop: 8 }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
          <Icon name="globe" size={17} style={{ color: 'var(--ink-3)' }} />
          <span style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{t('app.landingPreview')}</span>
          <Icon name="arrowUR" size={13} style={{ color: 'var(--ink-3)', marginLeft: 'auto' }} />
        </button>
        <div className="row" style={{ gap: 10, marginTop: 10, padding: '8px 6px' }}>
          <span style={{ width: 34, height: 34, borderRadius: '32%', background: 'linear-gradient(145deg,#3a3a3a,#1a1a1a)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 600, fontSize: 14, flex: 'none' }}>
            {(user || 'F')[0].toUpperCase()}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user ? user.split('@')[0] : 'Founder'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user || 'Agents Verse'}
            </div>
          </div>
          <button onClick={onLogout} className="btn btn-icon focusable" title={t('auth.logout')} aria-label={t('auth.logout')} style={{ width: 32, height: 32, flex: 'none', color: 'var(--ink-3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-3)'; }}>
            <Icon name="arrowUR" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* Re-export NAV so layout/palette can reference the same constant */
export { NAV };
