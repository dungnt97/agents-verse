/* =========================================================================
   AGENTS VERSE — /audits route
   Server Component: prefetches audited leads + full audit results + demo
   lead IDs, then passes them as props to the client AuditScreen.
   ?lead= searchParams handled here (Next 16: searchParams is a Promise).
   ========================================================================= */
import { auditedLeads, getAudit } from '@/lib/repositories/leads';
import { getDemos } from '@/lib/repositories/pipeline';
import { AuditScreen } from '@/components/workspace/audit/audit-screen';
import type { AuditResult } from '@/lib/data/types';

interface Props {
  searchParams: Promise<{ lead?: string }>;
}

export default async function AuditsPage({ searchParams }: Props) {
  const [audited, demos, { lead: initialLead }] = await Promise.all([
    auditedLeads(),
    getDemos(),
    searchParams,
  ]);

  // Prefetch all audit results so the client can look them up synchronously
  const auditResults = await Promise.all(audited.map(l => getAudit(l.id)));
  const auditMap = Object.fromEntries(
    auditResults.map((a): [string, AuditResult] => [a.id, a])
  );

  // Pass as plain array — client component converts to Set for O(1) lookup
  const demoLeadIds = demos.map(d => d.leadId).filter(Boolean) as string[];

  return (
    <AuditScreen
      audited={audited}
      auditMap={auditMap}
      demoLeadIds={demoLeadIds}
      initialLead={initialLead ?? null}
    />
  );
}
