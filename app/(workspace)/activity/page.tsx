'use client';

import { useRouter } from 'next/navigation';
import { ActivityScreen } from '@/components/workspace/activity/activity-screen';
import { useToast } from '@/lib/providers/toast-provider';

export default function ActivityPage() {
  const router = useRouter();
  const onAction = useToast();
  return (
    <ActivityScreen
      onAction={onAction}
      goAgent={(id) => router.push('/agents/' + id)}
      goRoom={(id) => router.push('/rooms/' + id)}
    />
  );
}
