'use client';

import { useRouter } from 'next/navigation';
import { RequestsScreen } from '@/components/workspace/requests/requests-screen';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import { useToast } from '@/lib/providers/toast-provider';

export default function RequestsPage() {
  const router = useRouter();
  const { requests, setRequests, addLead } = useWorkspaceState();
  const onAction = useToast();
  return (
    <RequestsScreen
      requests={requests}
      setRequests={setRequests}
      onAction={onAction}
      goLead={() => router.push('/leads')}
      onConvertLead={addLead}
    />
  );
}
