import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { agents as agentsTable } from '@/lib/db/schema';
import { AV } from '@/lib/data';
import type { Agent, AgentDetail } from '@/lib/data/types';
import { USE_DB } from './config';
import { getAgentActivity } from './agent-activity';

// agents row carries the role-derived detail in a jsonb column; the base Agent fields
// are everything except that column.
function toAgent(row: typeof agentsTable.$inferSelect): Agent {
  const { detail: _detail, ...base } = row;
  return base;
}

export async function getAgents(): Promise<Agent[]> {
  if (!USE_DB) return AV.agents;
  // Overlay live status/task/today-count from real subsystem jobs onto the seeded roster.
  const [rows, activity] = await Promise.all([db.select().from(agentsTable), getAgentActivity()]);
  // Display status reflects REAL activity only: default every agent to idle, then let the live overlay
  // (active runs / demos / audits / escalations) flip the ones actually working. This stops the seeded
  // base status from showing a fabricated "working" room when nothing is actually running.
  return rows.map((r) => ({ ...toAgent(r), status: 'idle', task: 'Idle — awaiting work', tasks: 0, cost: 0, ...(activity[r.id] ?? {}) }));
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  if (!USE_DB) return AV.agentById(id);
  const [row] = await db.select().from(agentsTable).where(eq(agentsTable.id, id)).limit(1);
  return row ? toAgent(row) : undefined;
}

export async function agentDetail(id: string): Promise<AgentDetail | null> {
  if (!USE_DB) return AV.agentDetail(id);
  const [row] = await db.select().from(agentsTable).where(eq(agentsTable.id, id)).limit(1);
  if (!row || !row.detail) return null;
  const { detail, ...base } = row;
  return { ...base, ...detail };
}
