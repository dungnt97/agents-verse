import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { generatedDemos } from '@/lib/db/schema';
import { USE_DB } from './config';

export type GeneratedDemoStatus = 'generating' | 'ready' | 'failed';

export interface GeneratedDemoView {
  status: GeneratedDemoStatus;
  html: string | null;
  error: string | null;
}

// Lead IDs whose generated demo is ready to view. Empty without a DB (demo/mock mode has no
// generated demos). Used by the audits screen to toggle the demo button to "View demo".
export async function getReadyGeneratedDemoLeadIds(): Promise<string[]> {
  if (!USE_DB) return [];
  const rows = await db
    .select({ leadId: generatedDemos.leadId })
    .from(generatedDemos)
    .where(eq(generatedDemos.status, 'ready'));
  return rows.map((r) => r.leadId);
}

// Full generated-demo row for one lead (status + html), or null if none / no DB. Read by the
// `/demo/[leadId]` route that serves the page and by the screen to reflect generation progress.
export async function getGeneratedDemo(leadId: string): Promise<GeneratedDemoView | null> {
  if (!USE_DB) return null;
  const [row] = await db
    .select()
    .from(generatedDemos)
    .where(eq(generatedDemos.leadId, leadId))
    .limit(1);
  if (!row) return null;
  return { status: row.status as GeneratedDemoStatus, html: row.html, error: row.error };
}
