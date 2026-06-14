/* =========================================================================
   AGENTS VERSE — Workspace layout (server)
   Fetches the rooms + agents directory from the repository layer and seeds the
   client WorkspaceDataProvider, then renders the interactive shell. The real
   auth gate (getSession) is added here in the auth phase; the client shell keeps
   a defense-in-depth guard. Forced dynamic so rendering is runtime-only and the
   DB is never queried at build time.
   ========================================================================= */
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getRooms } from '@/lib/repositories/rooms';
import { getAgents } from '@/lib/repositories/agents';
import { getCurrentUser } from '@/lib/auth/session';
import { WorkspaceDataProvider } from '@/lib/providers/workspace-data-provider';
import { WorkspaceShell } from '@/components/workspace/workspace-shell';

export const dynamic = 'force-dynamic';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  // Real auth gate: validates the session (DB) or demo cookie before any workspace render.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [rooms, agents] = await Promise.all([getRooms(), getAgents()]);
  return (
    <WorkspaceDataProvider rooms={rooms} agents={agents}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceDataProvider>
  );
}
