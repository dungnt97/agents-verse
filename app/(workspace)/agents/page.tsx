'use client';

import { useRouter } from 'next/navigation';
import { AgentsIndex } from '@/components/workspace/agents/agents-index';

export default function AgentsPage() {
  const router = useRouter();
  return (
    <AgentsIndex
      onOpen={id => router.push('/agents/' + id)}
      onRoom={id => router.push('/rooms/' + id)}
    />
  );
}
