/* Server Component — fetches rooms list + live metrics; delegates navigation to RoomsIndex. */
import { getRooms } from '@/lib/repositories/rooms';
import { getMetrics } from '@/lib/repositories/ops';
import { RoomsIndex } from '@/components/workspace/rooms/rooms-index';

export default async function RoomsPage() {
  const [rooms, metrics] = await Promise.all([getRooms(), getMetrics()]);
  return <RoomsIndex rooms={rooms} metrics={metrics} />;
}
