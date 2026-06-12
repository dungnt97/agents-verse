'use client';

import { CommandCenter } from '@/components/workspace/command/command-center';
import { useToast } from '@/lib/providers/toast-provider';

export default function CommandPage() {
  const onAction = useToast();
  return <CommandCenter onAction={onAction} />;
}
