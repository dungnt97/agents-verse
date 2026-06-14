/* Server Component — fetches rooms list, delegates navigation to the client wrapper inside RoomsIndex. */
import { getRooms } from '@/lib/repositories/rooms';
import { RoomsIndex } from '@/components/workspace/rooms/rooms-index';

export default async function RoomsPage() {
  const rooms = await getRooms();
  return <RoomsIndex rooms={rooms} />;
}
