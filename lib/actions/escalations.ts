'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { escalations } from '@/lib/db/schema';
import { guardMutation, type MutationResult } from './guard';

// Resolve (approve) or dismiss an escalation from the command center / review panel.
export async function resolveEscalation(
  id: string,
  resolution: 'resolved' | 'dismissed',
): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  await db
    .update(escalations)
    .set({ status: resolution, resolvedAt: new Date() })
    .where(eq(escalations.id, id));
  revalidatePath('/command');
  revalidatePath('/overview');
  return { ok: true };
}
