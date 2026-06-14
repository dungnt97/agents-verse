/* =========================================================================
   AGENTS VERSE — /demos route
   Server Component: prefetches all demos and passes them as props.
   ?lead= searchParams handled here (Next 16: searchParams is a Promise).
   ========================================================================= */
import { getDemos } from '@/lib/repositories/pipeline';
import { DemoManager } from '@/components/workspace/demos/demo-manager';

interface Props {
  searchParams: Promise<{ lead?: string }>;
}

export default async function DemosPage({ searchParams }: Props) {
  const [demos, { lead: initialLead }] = await Promise.all([
    getDemos(),
    searchParams,
  ]);

  return <DemoManager demos={demos} initialLead={initialLead ?? null} />;
}
