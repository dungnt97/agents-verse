/* =========================================================================
   AGENTS VERSE — WorkspaceDataProvider
   Holds the small rooms + agents reference directories, seeded once from the
   server layout (repositories), so deep leaf components (AgentAvatar, FloorMap,
   breadcrumbs, RoomPeek) keep synchronous agentById/roomById lookups without
   prop-drilling through every screen. Entity data that drives a single screen
   (leads, demos, deals, activity, …) still arrives via that page's props.
   ========================================================================= */
'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { AV } from '@/lib/data';
import type { Room, Agent } from '@/lib/data/types';

interface WorkspaceData {
  rooms: Room[];
  agents: Agent[];
  roomById: (id: string) => Room | undefined;
  agentById: (id: string) => Agent | undefined;
}

function makeDirectory(rooms: Room[], agents: Agent[]): WorkspaceData {
  return {
    rooms,
    agents,
    roomById: (id) => rooms.find((r) => r.id === id),
    agentById: (id) => agents.find((a) => a.id === id),
  };
}

// Used outside the workspace (e.g. the marketing landing floor preview), where there is
// no provider — fall back to the mock directory, the prototype's prior behavior.
const FALLBACK_DIRECTORY = makeDirectory(AV.rooms, AV.agents);

const WorkspaceDataContext = createContext<WorkspaceData | null>(null);

export function WorkspaceDataProvider({
  rooms,
  agents,
  children,
}: {
  rooms: Room[];
  agents: Agent[];
  children: ReactNode;
}) {
  const value = useMemo<WorkspaceData>(() => makeDirectory(rooms, agents), [rooms, agents]);
  return <WorkspaceDataContext.Provider value={value}>{children}</WorkspaceDataContext.Provider>;
}

export function useWorkspaceData(): WorkspaceData {
  return useContext(WorkspaceDataContext) ?? FALLBACK_DIRECTORY;
}
