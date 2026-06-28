import 'server-only';
import { eq, asc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { demos as demosTable, deals as dealsTable } from '@/lib/db/schema';
import { AV } from '@/lib/data';
import type { Demo, Deal } from '@/lib/data/types';
import { USE_DB } from './config';

export async function getDemos(): Promise<Demo[]> {
  if (!USE_DB) return AV.demos;
  return db.select().from(demosTable).orderBy(asc(demosTable.id));
}

export async function demoByLead(leadId: string): Promise<Demo | undefined> {
  if (!USE_DB) return AV.demoByLead(leadId);
  const [row] = await db.select().from(demosTable).where(eq(demosTable.leadId, leadId)).limit(1);
  return row ?? undefined;
}

export async function getDeals(): Promise<Deal[]> {
  if (!USE_DB) return AV.deals;
  return db.select().from(dealsTable).orderBy(asc(dealsTable.id));
}

export async function getDeal(id: string): Promise<Deal | undefined> {
  if (!USE_DB) return AV.deals.find((d) => d.id === id);
  const [row] = await db.select().from(dealsTable).where(eq(dealsTable.id, id)).limit(1);
  return row ?? undefined;
}

export async function dealByLead(leadId: string): Promise<Deal | undefined> {
  if (!USE_DB) return AV.dealByLead(leadId);
  const [row] = await db.select().from(dealsTable).where(eq(dealsTable.leadId, leadId)).limit(1);
  return row ?? undefined;
}
