/* Server component — awaits the params Promise (Next 16 dynamic API).
   Renders a thin client wrapper that owns router + toast. */
import { RoomDetailClient } from './room-detail-client';

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoomDetailClient id={id} />;
}
