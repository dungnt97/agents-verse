/* =========================================================================
   AGENTS VERSE — /leads route
   Server Component: prefetches demo lead IDs so LeadPipeline can show the
   "View Demo" button synchronously. Mutable leads stay in WorkspaceState.
   Cross-nav: audit → /audits?lead=id, demo → /demos?lead=id (wired inside
   LeadPipeline via useRouter + useToast, which are now client-only).
   ========================================================================= */
import { getDemos } from '@/lib/repositories/pipeline';
import { LeadPipeline } from '@/components/workspace/pipeline/lead-pipeline';
import { DiscoveryTrigger } from '@/components/workspace/pipeline/discovery-trigger';

export default async function LeadsPage() {
  const demos = await getDemos();
  // Pass as plain array — client component converts to Set for O(1) lookup
  const demoLeadIds = demos.map(d => d.leadId).filter(Boolean) as string[];

  return (
    <>
      <DiscoveryTrigger />
      <LeadPipeline demoLeadIds={demoLeadIds} />
    </>
  );
}
