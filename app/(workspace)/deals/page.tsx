/* =========================================================================
   AGENTS VERSE — /deals route
   Server Component: prefetches all deals and passes them as props.
   ?lead= searchParams handled here (Next 16: searchParams is a Promise).
   ========================================================================= */
import { getDeals } from '@/lib/repositories/pipeline';
import { DealsScreen } from '@/components/workspace/deals/deals-screen';

interface Props {
  searchParams: Promise<{ lead?: string }>;
}

export default async function DealsPage({ searchParams }: Props) {
  const [deals, { lead: initialLead }] = await Promise.all([
    getDeals(),
    searchParams,
  ]);

  return <DealsScreen deals={deals} initialLead={initialLead ?? null} />;
}
