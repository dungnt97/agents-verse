'use client';

import { useRouter } from 'next/navigation';
import { RoomDetail } from '@/components/workspace/rooms/room-detail';
import { useToast } from '@/lib/providers/toast-provider';
import type { Room, RoomProject, TimelineItem } from '@/lib/data/types';

interface RoomDetailClientProps {
  id: string;
  room: Room;
  projects: RoomProject[];
  timeline: TimelineItem[];
  metrics: [string, string | number][];
}

export function RoomDetailClient({ id, room, projects, timeline, metrics }: RoomDetailClientProps) {
  const router = useRouter();
  const toast = useToast();
  return (
    <RoomDetail
      roomId={id}
      room={room}
      projects={projects}
      timeline={timeline}
      metrics={metrics}
      onBack={() => router.push('/rooms')}
      onAgent={agentId => router.push('/agents/' + agentId)}
      onAction={toast}
      goDemos={() => router.push('/demos')}
    />
  );
}
