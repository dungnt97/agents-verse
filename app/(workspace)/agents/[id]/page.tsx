/* Server component — awaits the params Promise (Next 16 dynamic API).
   Renders a thin client wrapper that owns router + toast. */
import { AgentDetailClient } from './agent-detail-client';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentDetailClient id={id} />;
}
