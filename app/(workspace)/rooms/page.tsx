'use client';

import { useRouter } from 'next/navigation';
import { RoomsIndex } from '@/components/workspace/rooms/rooms-index';

export default function RoomsPage() {
  const router = useRouter();
  return (
    <RoomsIndex
      onOpen={id => router.push('/rooms/' + id)}
      onAgent={id => router.push('/agents/' + id)}
    />
  );
}
