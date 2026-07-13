import { getLeadPublicContext } from '@/lib/repositories/leads';
import { demoLanguageForAddress } from '@/lib/data/locale';
import { InquiryScreen } from '@/components/inquire/inquiry-screen';

// Public page a prospect reaches from the "Interested?" button on their demo. Trusted first-party page
// (normal app CSP, NOT the demo's strict one) so it CAN run a chat + a form — the two things the LLM-authored
// demo page is deliberately forbidden to do. Dynamic SSR; degrades to a generic state when the lead/DB is
// absent so it never crashes in demo mode.
export const dynamic = 'force-dynamic';

export default async function InquirePage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const lead = await getLeadPublicContext(leadId);
  const language = demoLanguageForAddress(lead?.formattedAddress);
  return <InquiryScreen leadId={leadId} company={lead?.company ?? null} language={language} />;
}
