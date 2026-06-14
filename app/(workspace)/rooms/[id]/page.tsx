/* Server Component — awaits the params Promise (Next 16 dynamic API).
   Fetches all room-specific data via repositories and passes it as props
   to the client wrapper that owns router + toast. */
import { RoomDetailClient } from './room-detail-client';
import { getRoom, roomProjects, roomTimeline, roomMetrics } from '@/lib/repositories/rooms';
import type { Room, RoomProject, TimelineItem } from '@/lib/data/types';

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch all four data slices in parallel; fall back to 'design' room if id is unknown.
  const [roomOrUndef, projects, timeline, metrics] = await Promise.all([
    getRoom(id),
    roomProjects(id),
    roomTimeline(id),
    roomMetrics(id),
  ]);

  // Mirror the original fallback: unknown id → 'design'
  let room = roomOrUndef;
  if (!room) {
    const [fallback, fallbackProjects, fallbackTimeline, fallbackMetrics] = await Promise.all([
      getRoom('design'),
      roomProjects('design'),
      roomTimeline('design'),
      roomMetrics('design'),
    ]);
    room = fallback as Room;
    return (
      <RoomDetailClient
        id="design"
        room={room}
        projects={fallbackProjects}
        timeline={fallbackTimeline}
        metrics={fallbackMetrics}
      />
    );
  }

  return (
    <RoomDetailClient
      id={id}
      room={room as Room}
      projects={projects as RoomProject[]}
      timeline={timeline as TimelineItem[]}
      metrics={metrics}
    />
  );
}
