import { CommandCenter } from '@/components/workspace/command/command-center';
import { getOpenEscalations } from '@/lib/repositories/ops';

// Server Component — fetches the OPEN escalation queue (resolved/dismissed drop off) and
// passes it to the client screen. Toast is wired inside CommandCenter via useToast.
export default async function CommandPage() {
  const escalations = await getOpenEscalations();
  return <CommandCenter escalations={escalations} />;
}
