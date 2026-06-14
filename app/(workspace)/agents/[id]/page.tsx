/* Server component — awaits the params Promise (Next 16 dynamic API).
   Fetches agent detail from the repository, then renders a thin client wrapper
   that owns router + toast. */
import { AgentDetailClient } from './agent-detail-client';
import { agentDetail } from '@/lib/repositories/agents';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await agentDetail(id);
  return <AgentDetailClient id={id} detail={detail} />;
}
