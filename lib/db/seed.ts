/**
 * Idempotent seed. Always seeds the PRODUCT CONFIG (rooms, agents, founder settings, founder login).
 * Business/operational DATA (leads, audits, demos, deals, requests, escalations, activity, metrics) is
 * NOT seeded by default — the running app should fill those from real subsystem runs (discovery →
 * audit → demo → outreach → deals), so the dashboard reflects real operation, not mock fixtures.
 *
 * Set SEED_DEMO_DATA=true to also load the mock AV business data — used by the DB integration test
 * suite (deterministic fixtures) and for a populated local showcase. Safe to run repeatedly
 * (onConflictDoNothing) and as a Docker entrypoint step (migrate → seed → start).
 *
 * Run: `npm run db:seed` (needs DATABASE_URL + BETTER_AUTH_SECRET in .env.local).
 */
import { count } from 'drizzle-orm';
import { db, sql } from './client';
import {
  rooms,
  agents,
  leads,
  demos,
  generatedDemos,
  deals,
  audits,
  escalations,
  activity,
  demoRequests,
  metrics,
  settings,
  user,
  account,
  leadStageEnum,
  demoStatusEnum,
  dealStageEnum,
  reqStatusEnum,
} from './schema';
import { AV } from '../data';
import { DEFAULT_COST_PER_RUN } from '../data/cost-meter';
import { auth } from '../auth/server';

type LeadStage = (typeof leadStageEnum.enumValues)[number];
type DemoStatus = (typeof demoStatusEnum.enumValues)[number];
type DealStage = (typeof dealStageEnum.enumValues)[number];
type ReqStatus = (typeof reqStatusEnum.enumValues)[number];

// Always-on: the product configuration. The 11 agents + 8 rooms are the agency's fixed org chart
// (not "mock data" — there is no subsystem that invents agents); the settings singleton is the founder
// control surface. Their vanity numbers (agent conf/quality/cost) are overlaid live where a real signal
// exists; the rest is structural identity.
async function seedConfig() {
  await db.insert(rooms).values(AV.rooms).onConflictDoNothing();

  await db
    .insert(agents)
    .values(
      AV.agents.map((a) => {
        const d = AV.agentDetail(a.id)!;
        return {
          ...a,
          // Activity fields start neutral — real status/counts come from live subsystem jobs, not the seed.
          status: 'idle',
          task: 'Idle — awaiting work',
          tasks: 0,
          cost: 0,
          detail: {
            purpose: d.purpose,
            skills: d.skills,
            tools: d.tools,
            history: d.history,
            outputs: d.outputs,
            approval: d.approval,
            maxTasks: d.maxTasks,
            escalationThreshold: d.escalationThreshold,
            chatPrompts: d.chatPrompts,
          },
        };
      }),
    )
    .onConflictDoNothing();

  // Founder control surface (autonomy + guardrails + pricing). Real values once the founder edits them.
  await db
    .insert(settings)
    .values({
      id: 'default',
      autonomyMode: 'guarded',
      guardrails: { autoApproveLimit: 4000, dailyCostLimit: AV.metrics.costLimit, costPerRun: DEFAULT_COST_PER_RUN },
      pricing: { landingPage: 900, businessWebsite: 2400 },
    })
    .onConflictDoNothing();
}

// Opt-in (SEED_DEMO_DATA=true): the mock AV business data. Off by default so the running app starts
// with NO mock leads/audits/demos/deals/etc. — real runs populate them. Used by the DB test suite.
async function seedDemoData() {
  await db
    .insert(leads)
    .values(
      AV.leads.map((l) => ({
        ...l,
        stage: l.stage as LeadStage,
        demo: l.demo as DemoStatus,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(demos)
    .values(AV.demos.map((d) => ({ ...d, status: d.status as DemoStatus })))
    .onConflictDoNothing();

  // getDemos()/demoByLead() (DB mode) derive the Demos screen from generated_demos joined with lead+audit,
  // so seed a ready generated_demo for each demo'd lead — keeps DB-mode reads in parity with the mock.
  await db
    .insert(generatedDemos)
    .values(
      AV.demos.map((d) => ({
        leadId: d.leadId,
        html: '<!doctype html><meta charset="utf-8"><title>' + d.business + ' — demo</title>',
        status: 'ready' as const,
        error: null,
        updatedAt: new Date(),
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(deals)
    .values(AV.deals.map((d) => ({ ...d, stage: d.stage as DealStage })))
    .onConflictDoNothing();

  await db
    .insert(audits)
    .values(
      AV.leads.map((l) => {
        const a = AV.audit(l.id);
        return {
          leadId: l.id,
          scores: a.scores,
          problems: a.problems,
          redesign: a.redesign,
          confidence: a.confidence,
          summary: a.summary,
        };
      }),
    )
    .onConflictDoNothing();

  await db.insert(escalations).values(AV.escalations).onConflictDoNothing();

  await db
    .insert(activity)
    .values(AV.activity.map((it, i) => ({ id: `act-${i}`, seq: AV.activity.length - i, ...it })))
    .onConflictDoNothing();

  await db
    .insert(demoRequests)
    .values(AV.demoRequests.map((r) => ({ ...r, status: r.status as ReqStatus })))
    .onConflictDoNothing();

  await db.insert(metrics).values({ id: 'current', ...AV.metrics }).onConflictDoNothing();
}

async function seedFounder() {
  const email = process.env.FOUNDER_EMAIL ?? 'founder@agentsverse.ai';
  const password = process.env.FOUNDER_PASSWORD;
  // No fallback password: a default literal here is a publicly readable credential (this file is
  // committed), the entrypoint auto-runs the seed on every boot, and onConflictDoNothing would
  // make that credential permanent. Skipping is safe — the seed is idempotent, so the founder is
  // created on the next run after FOUNDER_PASSWORD is set.
  if (!password) {
    console.warn(
      '[seed] FOUNDER_PASSWORD is not set — skipping founder creation. Set it in .env.local and re-run db:seed (or restart the container).',
    );
    return null;
  }

  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(password);

  await db
    .insert(user)
    .values({ id: 'founder', name: 'Founder', email, emailVerified: true })
    .onConflictDoNothing();

  await db
    .insert(account)
    .values({
      id: 'founder-credential',
      accountId: 'founder',
      providerId: 'credential',
      userId: 'founder',
      password: passwordHash,
    })
    .onConflictDoNothing();

  return email;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to seed. Set it in .env.local.');
  }
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error('BETTER_AUTH_SECRET is required to seed the founder credential.');
  }

  await seedConfig();
  const demoData = process.env.SEED_DEMO_DATA === 'true';
  if (demoData) await seedDemoData();
  const email = await seedFounder();

  const [{ value: leadCount }] = await db.select({ value: count() }).from(leads);
  console.log(
    `Seed complete. config=on, demoData=${demoData}, leads=${leadCount}, founder=${email ?? 'SKIPPED (FOUNDER_PASSWORD unset)'}`,
  );

  await sql.end({ timeout: 5 });
}

void main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
