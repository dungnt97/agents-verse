import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { rooms as roomsTable, leads as leadsTable } from '@/lib/db/schema';
import {
  AV,
  ROOM_PROJECTS,
  PROJ_STATUS,
  TIMELINE,
  DEFAULT_TIMELINE,
  buildRoomMetrics,
} from '@/lib/data';
import type { Room, RoomProject, TimelineItem } from '@/lib/data/types';
import { USE_DB } from './config';

// DB rooms.pos is text|null; the Room type uses optional (string|undefined).
function toRoom(r: typeof roomsTable.$inferSelect): Room {
  return { ...r, pos: r.pos ?? undefined };
}

export async function getRooms(): Promise<Room[]> {
  if (!USE_DB) return AV.rooms;
  const rows = await db.select().from(roomsTable);
  return rows.map(toRoom);
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

// Static timeline overlay; only the room (for its fallback agent) comes from the DB.
export async function roomTimeline(roomId: string): Promise<TimelineItem[]> {
  const room = await getRoom(roomId);
  const fallbackAgent = room ? room.agents[0] : null;
  return (TIMELINE[roomId] || DEFAULT_TIMELINE).map((e) => ({
    ...e,
    agent: e.agent || fallbackAgent,
  }));
}

export async function roomMetrics(roomId: string): Promise<[string, string | number][]> {
  if (!USE_DB) return AV.roomMetrics(roomId);
  const room = await getRoom(roomId);
  return room ? buildRoomMetrics(room) : [];
}
