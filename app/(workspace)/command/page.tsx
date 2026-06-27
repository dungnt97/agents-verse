import { CommandCenter } from '@/components/workspace/command/command-center';
import { getOpenEscalations, getMetrics } from '@/lib/repositories/ops';

// Server Component — fetches the OPEN escalation queue + live metrics, passes them to the client screen.
export default async function CommandPage() {
  const [escalations, metrics] = await Promise.all([getOpenEscalations(), getMetrics()]);
  return <CommandCenter escalations={escalations} metrics={metrics} />;
}
