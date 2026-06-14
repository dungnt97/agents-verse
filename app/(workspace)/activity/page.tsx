import { ActivityScreen } from '@/components/workspace/activity/activity-screen';
import { getActivity } from '@/lib/repositories/ops';

// Server Component — fetches activity feed and passes to the client screen.
// Router navigation and toast are wired inside ActivityScreen via useRouter/useToast.
export default async function ActivityPage() {
  const activity = await getActivity();
  return <ActivityScreen activity={activity} />;
}
