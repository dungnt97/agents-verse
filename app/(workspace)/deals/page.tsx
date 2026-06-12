/* =========================================================================
   AGENTS VERSE — /deals route
   Reads ?lead= query param to pre-open the drawer for that lead's deal.
   useSearchParams must be inside Suspense — Next 16 build requirement.
   ========================================================================= */
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { DealsScreen } from '@/components/workspace/deals/deals-screen';
import { useToast } from '@/lib/providers/toast-provider';

function DealsInner() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const initialLead = searchParams.get('lead');

  return (
    <DealsScreen
      initialLead={initialLead}
      onAction={toast}
    />
  );
}

export default function DealsPage() {
  return (
    <Suspense fallback={null}>
      <DealsInner />
    </Suspense>
  );
}
