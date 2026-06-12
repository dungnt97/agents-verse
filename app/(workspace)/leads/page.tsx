/* =========================================================================
   AGENTS VERSE — /leads route
   Renders the kanban pipeline with mutable leads from WorkspaceState.
   Cross-nav: audit → /audits?lead=id, demo → /demos?lead=id.
   ========================================================================= */
'use client';

import { useRouter } from 'next/navigation';
import { LeadPipeline } from '@/components/workspace/pipeline/lead-pipeline';
import { useToast } from '@/lib/providers/toast-provider';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';

export default function LeadsPage() {
  const router = useRouter();
  const toast = useToast();
  const { leads } = useWorkspaceState();

  return (
    <LeadPipeline
      leads={leads}
      onAction={toast}
      onOpenAudit={(id) => router.push('/audits?lead=' + id)}
      onOpenDemo={(id) => router.push('/demos?lead=' + id)}
    />
  );
}
