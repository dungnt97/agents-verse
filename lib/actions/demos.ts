'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { demos, demoStatusEnum } from '@/lib/db/schema';
import { DEMO_STATUS } from '@/lib/data/format';
import { guardMutation, type MutationResult } from './guard';

type DemoStatus = (typeof demoStatusEnum.enumValues)[number];

// Move a demo through its review/send lifecycle. Keeps statusLabel/statusCls in sync with the
// shared DEMO_STATUS map so the UI badge stays consistent.
export async function updateDemoStatus(demoId: string, status: string): Promise<MutationResult> {
  const blocked = await guardMutation();
  if (blocked) return blocked;
  if (!demoStatusEnum.enumValues.includes(status as DemoStatus)) {
    return { ok: false, message: `invalid demo status: ${status}` };
  }
  const meta = DEMO_STATUS[status] ?? DEMO_STATUS.draft;
  await db
    .update(demos)
    .set({ status: status as DemoStatus, clientStatus: status, statusLabel: meta.label, statusCls: meta.cls })
    .where(eq(demos.id, demoId));
  revalidatePath('/demos');
  return { ok: true };
}
