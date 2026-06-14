/* =========================================================================
   AGENTS VERSE — Workspace shell (client)
   Shared interactive shell for all workspace routes: Sidebar + TopBar + main
   + overlays. Local state: palette (⌘K), review (bell panel), mobileNav.
   Effects: Cmd/Ctrl+K toggles palette; ESC closes; scroll reset on route change.
   Auth guard: client-side defense-in-depth — the server layout (getSession) is
   the real gate; this catches client navigation after logout without looping
   (login is outside the (workspace) group).
   ========================================================================= */
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/providers/auth-provider';
import { useToast } from '@/lib/providers/toast-provider';
import { Sidebar } from '@/components/workspace/sidebar';
import { TopBar } from '@/components/workspace/top-bar';
import { CommandPalette } from '@/components/workspace/command-palette';
import { ReviewCenter } from '@/components/workspace/review-center';
import { ChatWidget } from '@/components/marketing/chat-widget';

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { authed } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pushToast = useToast();

  const [palette, setPalette] = useState(false);
  const [review, setReview] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  /* Defense-in-depth auth guard — the server layout handles SSR redirect;
     this catches client-side navigation to a workspace route after logout. */
  useEffect(() => {
    if (!authed) router.replace('/login');
  }, [authed, router]);

  /* Cmd/Ctrl+K toggles palette; ESC closes palette or review */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if (e.key === 'Escape') {
        setPalette(false);
        setReview(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Scroll reset on route change */
  useEffect(() => {
    window.scrollTo(0, 0);
    const el = document.getElementById('app-scroll');
    if (el) el.scrollTop = 0;
  }, [pathname]);

  /* Close mobile nav on route change */
  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

      {/* Mobile backdrop — only visible when sidebar is open on small screens */}
      {mobileNav && (
        <div
          className="av-backdrop hide-desktop"
          onClick={() => setMobileNav(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 129, background: 'rgba(20,18,12,.4)', backdropFilter: 'blur(2px)' }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar
          onSearch={() => setPalette(true)}
          onReview={() => setReview(true)}
          onMenu={() => setMobileNav((m) => !m)}
        />
        <main id="app-scroll" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <ReviewCenter open={review} onClose={() => setReview(false)} onAction={pushToast} />
      <ChatWidget />
    </div>
  );
}
