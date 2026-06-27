import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { rooms as roomsTable, leads as leadsTable } from '@/lib/db/schema';
import {
  AV,
  ROOM_PROJECTS,
  PROJ_STATUS,
  buildRoomMetrics,
} from '@/lib/data';
import type { Room, RoomProject, TimelineItem } from '@/lib/data/types';
import { getAgents } from './agents';
import { USE_DB } from './config';

// DB rooms.pos is text|null; the Room type uses optional (string|undefined).
function toRoom(r: typeof roomsTable.$inferSelect): Room {
  return { ...r, pos: r.pos ?? undefined };
}

// Room rows are seeded config (name/purpose/position). Their live STATS — which agents are in the room,
// how many are active right now, the room status + a short current-status line — are derived from the
// live agent activity, not from the seeded mock counts. done/health have no real per-room telemetry, so
// they report 0/100 honestly rather than a fabricated number.
const ACTIVE_AGENT = new Set(['working', 'active']);
export async function getRooms(): Promise<Room[]> {
  if (!USE_DB) return AV.rooms;
  const [rows, agents] = await Promise.all([db.select().from(roomsTable), getAgents()]);
  return rows.map((r) => {
    const room = toRoom(r);
    const inRoom = agents.filter((a) => a.room === room.id);
    const running = inRoom.filter((a) => ACTIVE_AGENT.has(a.status)).length;
    const status = running === 0 ? 'idle' : inRoom.some((a) => a.status === 'review') ? 'review' : 'active';
    const mission = running > 0 ? `${running} active task${running === 1 ? '' : 's'} right now` : 'Idle — awaiting work';
    return { ...room, agents: inRoom.map((a) => a.id), running, active: running, status, done: 0, health: 100, mission };
  });
}

export async function getRoom(id: string): Promise<Room | undefined> {
  if (!USE_DB) return AV.roomById(id);
  const [row] = await db.select().from(roomsTable).where(eq(roomsTable.id, id)).limit(1);
  return row ? toRoom(row) : undefined;
}

// Leads assigned to a room, overlaid with the static project-status presentation map.
export async function roomProjects(roomId: string): Promise<RoomProject[]> {
  if (!USE_DB) return AV.roomProjects(roomId);
  const ids = ROOM_PROJECTS[roomId] || [];
  if (ids.length === 0) return [];
  const rows = await db.select().from(leadsTable).where(inArray(leadsTable.id, ids));
  // Skip any assigned lead id missing from the DB instead of crashing on a non-null assertion.
  return ids
    .map((id) => {
      const l = rows.find((x) => x.id === id);
      return l ? ({ ...l, ...PROJ_STATUS[id] } as RoomProject) : null;
    })
    .filter((p): p is RoomProject => p !== null);
}

// There is no real per-room event log yet, so the timeline has no live source. Return an
// empty list rather than seeded mock events; the UI shows an honest empty state.
export async function roomTimeline(roomId: string): Promise<TimelineItem[]> {
  void roomId;
  return [];
}

export async function roomMetrics(roomId: string): Promise<[string, string | number][]> {
  if (!USE_DB) return AV.roomMetrics(roomId);
  const [room, agents] = await Promise.all([getRoom(roomId), getAgents()]);
  if (!room) return [];
  // getRoom returns the seeded room row whose agents/running/status are static snapshots.
  // Overlay them with LIVE agent activity (same derivation as getRooms) so the metrics strip
  // reflects who is actually assigned/active right now. health/done have no real telemetry.
  const inRoom = agents.filter((a) => a.room === room.id);
  const running = inRoom.filter((a) => ACTIVE_AGENT.has(a.status)).length;
  const status = running === 0 ? 'idle' : inRoom.some((a) => a.status === 'review') ? 'review' : 'active';
  return buildRoomMetrics({ ...room, agents: inRoom.map((a) => a.id), running, active: running, status });
}
