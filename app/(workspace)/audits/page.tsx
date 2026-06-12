/* =========================================================================
   AGENTS VERSE — /audits route
   Reads ?lead= query param to pre-select a lead in the audit rail.
   useSearchParams must be inside Suspense — Next 16 build requirement.
   ========================================================================= */
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuditScreen } from '@/components/workspace/audit/audit-screen';
import { useToast } from '@/lib/providers/toast-provider';

function AuditsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const initialLead = searchParams.get('lead');

  return (
    <AuditScreen
      initialLead={initialLead}
      onAction={toast}
      goDemos={(id) => router.push('/demos?lead=' + id)}
      goLead={() => router.push('/leads')}
    />
  );
}

export default function AuditsPage() {
  return (
    <Suspense fallback={null}>
      <AuditsInner />
    </Suspense>
  );
}
