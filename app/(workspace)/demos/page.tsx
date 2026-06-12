/* =========================================================================
   AGENTS VERSE — /demos route
   Reads ?lead= query param to pre-open the drawer for that lead's demo.
   useSearchParams must be inside Suspense — Next 16 build requirement.
   ========================================================================= */
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DemoManager } from '@/components/workspace/demos/demo-manager';
import { useToast } from '@/lib/providers/toast-provider';

function DemosInner() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const initialLead = searchParams.get('lead');

  return (
    <DemoManager
      initialLead={initialLead}
      onAction={toast}
    />
  );
}

export default function DemosPage() {
  return (
    <Suspense fallback={null}>
      <DemosInner />
    </Suspense>
  );
}
