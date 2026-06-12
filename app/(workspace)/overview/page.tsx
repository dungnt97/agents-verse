'use client';

import { useRouter } from 'next/navigation';
import { FloorOverview } from '@/components/workspace/overview/floor-overview';
import { useToast } from '@/lib/providers/toast-provider';

export default function OverviewPage() {
  const router = useRouter();
  const onAction = useToast();
  return (
    <FloorOverview
      onAction={onAction}
      goCommand={() => router.push('/command')}
      goRoom={(id) => router.push('/rooms/' + id)}
    />
  );
}
