'use client';

import { useRouter } from 'next/navigation';
import { AgentDetail } from '@/components/workspace/agents/agent-detail';
import { useToast } from '@/lib/providers/toast-provider';

export function AgentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <AgentDetail
      agentId={id || 'nova'}
      onBack={() => router.push('/agents')}
      onRoom={roomId => router.push('/rooms/' + roomId)}
      onAction={toast}
    />
  );
}
