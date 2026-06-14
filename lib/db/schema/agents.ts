import { pgTable, text, integer, real, jsonb } from 'drizzle-orm/pg-core';
import type { Agent, AgentDetail } from '@/lib/data/types';

// The extra fields agentDetail() layers on top of a base Agent (derived from role in the
// mock). Stored as one jsonb blob so the repository reads a row instead of re-deriving.
export type AgentDetailExtra = Omit<AgentDetail, keyof Agent>;

export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  short: text('short').notNull(),
  purpose: text('purpose').notNull(),
  status: text('status').notNull(),
  // string[] of agent ids assigned to the room.
  agents: jsonb('agents').$type<string[]>().notNull(),
  active: integer('active').notNull(),
  running: integer('running').notNull(),
  done: integer('done').notNull(),
  health: integer('health').notNull(),
  mission: text('mission').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  pos: text('pos'),
});

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  room: text('room')
    .notNull()
    .references(() => rooms.id),
  status: text('status').notNull(),
  conf: integer('conf').notNull(),
  tasks: integer('tasks').notNull(),
  quality: integer('quality').notNull(),
  cost: real('cost').notNull(),
  task: text('task').notNull(),
  hue: integer('hue').notNull(),
  // skills / tools / purpose / history / outputs / approval / maxTasks /
  // escalationThreshold / chatPrompts — the role-derived detail panel.
  detail: jsonb('detail').$type<AgentDetailExtra>(),
});
