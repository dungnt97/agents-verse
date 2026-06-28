/* Server component — renders a print-ready proposal/quote for a deal. The founder opens it, reviews,
   and uses the browser's "Save as PDF" (print) to produce a branded PDF to send. */
import { notFound } from 'next/navigation';
import { getDeal } from '@/lib/repositories/pipeline';
import { getSettings } from '@/lib/repositories/ops';
import { buildProposal, type ProposalPricing } from '@/lib/proposals/proposal';
import { ProposalDocument } from '@/components/workspace/deals/proposal-document';

export default async function DealProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();
  const settings = await getSettings();
  const pricing = (settings?.pricing ?? null) as ProposalPricing | null;
  const doc = buildProposal(deal, pricing);
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return <ProposalDocument doc={doc} date={date} />;
}
