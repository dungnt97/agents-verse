/* =========================================================================
   AGENTS VERSE — /settings route
   Server Component: prefetches the founder settings singleton (guardrails,
   pricing, autonomy) and passes it to the client SettingsScreen so the
   persisted fields hydrate from the database instead of hardcoded defaults.
   ========================================================================= */
import { getSettings } from '@/lib/repositories/ops';
import { SettingsScreen } from '@/components/workspace/settings/settings-screen';

export default async function SettingsPage() {
  const settings = await getSettings();
  return <SettingsScreen settings={settings} />;
}
