'use client';

import { SettingsScreen } from '@/components/workspace/settings/settings-screen';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import { useToast } from '@/lib/providers/toast-provider';

export default function SettingsPage() {
  const { mode, setMode } = useWorkspaceState();
  const onAction = useToast();
  return <SettingsScreen mode={mode} setMode={setMode} onAction={onAction} />;
}
