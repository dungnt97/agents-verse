import { CommandCenter } from '@/components/workspace/command/command-center';
import { getEscalations } from '@/lib/repositories/ops';

// Server Component — fetches escalation queue and passes to the client screen.
// Toast is wired inside CommandCenter via useToast.
export default async function CommandPage() {
  const escalations = await getEscalations();
  return <CommandCenter escalations={escalations} />;
}
