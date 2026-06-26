import { db } from '../db/client';
import { activity } from '../db/schema';

// Worker-safe activity recorder (relative imports, no `server-only`). Every real subsystem event
// (audit done, demo ready, outreach sent, deal advanced, delivery built, onboarding sent) appends one
// row so the dashboard Activity feed reflects REAL operation instead of seeded copy. Best-effort:
// a logging failure never breaks the run. Ordered newest-first by `seq` = unix seconds.
export async function recordActivity(e: {
  agent: string;
  room: string;
  type: string;
  text: string;
  status?: string;
}): Promise<void> {
  try {
    const now = Date.now();
    await db
      .insert(activity)
      .values({
        id: `act-${e.type}-${now}-${Math.round(Math.random() * 1e6)}`,
        seq: Math.floor(now / 1000),
        t: 'just now',
        agent: e.agent,
        room: e.room,
        type: e.type,
        text: e.text,
        status: e.status ?? 'info',
      })
      .onConflictDoNothing();
  } catch {
    // activity is best-effort telemetry — never fail the run because a log row didn't write.
  }
}
