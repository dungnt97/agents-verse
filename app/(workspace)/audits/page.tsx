/* =========================================================================
   AGENTS VERSE — /audits route
   Server Component: prefetches audited leads + full audit results + demo
   lead IDs, then passes them as props to the client AuditScreen.
   ?lead= searchParams handled here (Next 16: searchParams is a Promise).
   ========================================================================= */
import { auditedLeads, getAudit } from '@/lib/repositories/leads';
import { getDemos } from '@/lib/repositories/pipeline';
import { getAuditJobs } from '@/lib/repositories/audit-jobs';
import { getReadyGeneratedDemoLeadIds } from '@/lib/repositories/generated-demos';
import { AuditScreen, type AuditJobView } from '@/components/workspace/audit/audit-screen';
import type { AuditResult } from '@/lib/data/types';

interface Props {
  searchParams: Promise<{ lead?: string }>;
}

export default async function AuditsPage({ searchParams }: Props) {
  const [audited, demos, jobs, generatedDemoLeadIds, { lead: initialLead }] = await Promise.all([
    auditedLeads(),
    getDemos(),
    getAuditJobs(),
    getReadyGeneratedDemoLeadIds(),
    searchParams,
  ]);

  // Prefetch all audit results so the client can look them up synchronously
  const auditResults = await Promise.all(audited.map(l => getAudit(l.id)));
  const auditMap = Object.fromEntries(
    auditResults.map((a): [string, AuditResult] => [a.id, a])
  );

  // Pass as plain array — client component converts to Set for O(1) lookup
  const demoLeadIds = demos.map(d => d.leadId).filter(Boolean) as string[];

  // Reduce audit jobs to the client-safe { status, error } view keyed by leadId
  const jobMap: Record<string, AuditJobView> = Object.fromEntries(
    Object.entries(jobs).map(([leadId, j]) => [leadId, { status: j.status, error: j.error }])
  );

  return (
    <AuditScreen
      audited={audited}
      auditMap={auditMap}
      demoLeadIds={demoLeadIds}
      generatedDemoLeadIds={generatedDemoLeadIds}
      jobMap={jobMap}
      initialLead={initialLead ?? null}
    />
  );
}
