'use client';

import { useRouter } from 'next/navigation';
import { AgentDetail } from '@/components/workspace/agents/agent-detail';
import { useToast } from '@/lib/providers/toast-provider';
import type { AgentDetail as AgentDetailData } from '@/lib/data/types';

export function AgentDetailClient({ id, detail }: { id: string; detail: AgentDetailData | null }) {
  const router = useRouter();
  const toast = useToast();
  return (
    <AgentDetail
      agentId={id || 'nova'}
      detail={detail}
      onBack={() => router.push('/agents')}
      onRoom={roomId => router.push('/rooms/' + roomId)}
      onAction={toast}
    />
  );
}
