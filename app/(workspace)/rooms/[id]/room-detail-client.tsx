'use client';

import { useRouter } from 'next/navigation';
import { RoomDetail } from '@/components/workspace/rooms/room-detail';
import { useToast } from '@/lib/providers/toast-provider';

export function RoomDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <RoomDetail
      roomId={id || 'design'}
      onBack={() => router.push('/rooms')}
      onAgent={agentId => router.push('/agents/' + agentId)}
      onAction={toast}
      goDemos={() => router.push('/demos')}
    />
  );
}
