import { FloorOverview } from '@/components/workspace/overview/floor-overview';
import { getOpenEscalations, getActivity, getMetrics } from '@/lib/repositories/ops';

export default async function OverviewPage() {
  const [escalations, activity, metrics] = await Promise.all([getOpenEscalations(), getActivity(), getMetrics()]);
  return <FloorOverview escalations={escalations} activity={activity} metrics={metrics} />;
}
