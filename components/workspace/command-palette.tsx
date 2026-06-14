/* =========================================================================
   AGENTS VERSE — CommandPalette (port of CommandPalette from app-shell.jsx)
   ⌘K search over NAV pages, workspace agents (from directory), and leads (from the
   workspace state provider — DB-backed or demo, same source the pipeline uses).
   Opens with focus; ESC and backdrop-click close via onClose prop.
   ========================================================================= */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import { NAV } from './sidebar';

interface PaletteItem {
  typeKey: string;
  id: string;
  label: string;
  icon: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useI18n();
  const { agents } = useWorkspaceData();
  const { leads } = useWorkspaceState();

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const pages: PaletteItem[] = NAV.flatMap(g => g.items).map(i => ({ typeKey: 'shell.typePage', id: i.id, label: i.label, icon: i.icon }));
  // agents: sourced from workspace directory (server-seeded, client-synchronous)
  const ag: PaletteItem[] = agents.map(a => ({ typeKey: 'shell.typeAgent', id: 'agents', label: a.name + ' — ' + a.role, icon: 'agents' }));
  // leads: from the workspace state provider (same dual-mode source as the pipeline)
  const ld: PaletteItem[] = leads.map(l => ({ typeKey: 'shell.typeLead', id: 'leads', label: l.company, icon: 'leads' }));
  const all = [...pages, ...ag, ...ld].filter(x => x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);

  function onNav(id: string) {
    router.push('/' + id);
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,18,12,.4)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', paddingTop: '14vh' }}>
      <div onClick={e => e.stopPropagation()} className="card-elev" style={{ width: 560, maxWidth: '92vw', height: 'fit-content', maxHeight: '62vh', overflow: 'hidden', boxShadow: 'var(--sh-xl)', padding: 0 }}>
        <div className="row" style={{ gap: 11, padding: '15px 18px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('shell.searchPlaceholder')}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15.5, color: 'var(--ink)' }}
          />
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 6px' }}>ESC</span>
        </div>
        <div style={{ padding: 8, overflowY: 'auto', maxHeight: '48vh' }}>
          {all.length === 0 && (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>{t('shell.noResults')} &ldquo;{q}&rdquo;</div>
          )}
          {all.map((x, i) => (
            <button key={i} onClick={() => onNav(x.id)} className="row between focusable" style={{ width: '100%', padding: '10px 12px', borderRadius: 9, textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
              <span className="row" style={{ gap: 12 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-muted)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center' }}>
                  <Icon name={x.icon} size={16} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{x.label}</span>
              </span>
              <span className="badge badge-neutral" style={{ height: 19, fontSize: 10.5 }}>{t(x.typeKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
