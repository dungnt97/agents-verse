import { FloorOverview } from '@/components/workspace/overview/floor-overview';
import { getEscalations } from '@/lib/repositories/ops';
import { getActivity } from '@/lib/repositories/ops';

export default async function OverviewPage() {
  const [escalations, activity] = await Promise.all([getEscalations(), getActivity()]);
  return <FloorOverview escalations={escalations} activity={activity} />;
}
