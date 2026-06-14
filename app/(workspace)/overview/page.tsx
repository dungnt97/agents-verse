import { FloorOverview } from '@/components/workspace/overview/floor-overview';
import { getOpenEscalations } from '@/lib/repositories/ops';
import { getActivity } from '@/lib/repositories/ops';

export default async function OverviewPage() {
  const [escalations, activity] = await Promise.all([getOpenEscalations(), getActivity()]);
  return <FloorOverview escalations={escalations} activity={activity} />;
}
