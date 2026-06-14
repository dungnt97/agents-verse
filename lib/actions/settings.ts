'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { settings, autonomyModeEnum } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/auth/session';

type AutonomyMode = (typeof autonomyModeEnum.enumValues)[number];

// Persist the founder autonomy mode to the settings singleton (id 'default'). Upsert so the
// row is created if seeding hasn't run. Only invoked in DB mode.
export async function setAutonomyMode(mode: string): Promise<void> {
  if (!(await getCurrentUser())) throw new Error('Unauthorized');
  if (!autonomyModeEnum.enumValues.includes(mode as AutonomyMode)) {
    throw new Error('invalid autonomy mode: ' + mode);
  }
  const value = mode as AutonomyMode;

  await db
    .insert(settings)
    .values({ id: 'default', autonomyMode: value })
    .onConflictDoUpdate({
      target: settings.id,
      set: { autonomyMode: value, updatedAt: new Date() },
    });

  revalidatePath('/settings');
}
