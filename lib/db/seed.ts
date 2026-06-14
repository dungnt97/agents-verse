/**
 * Idempotent seed: ports the mock AV singleton into Postgres and creates the founder
 * login. Safe to run repeatedly (every insert uses onConflictDoNothing) and as a step
 * in the Docker entrypoint (migrate → seed → start).
 *
 * Run: `npm run db:seed` (needs DATABASE_URL + BETTER_AUTH_SECRET in .env.local).
 * Relative imports keep it resolvable under tsx.
 */
import { count } from 'drizzle-orm';
import { db, sql } from './client';
import {
  rooms,
  agents,
  leads,
  demos,
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
import { auth } from '../auth/server';

type LeadStage = (typeof leadStageEnum.enumValues)[number];
type DemoStatus = (typeof demoStatusEnum.enumValues)[number];
type DealStage = (typeof dealStageEnum.enumValues)[number];
type ReqStatus = (typeof reqStatusEnum.enumValues)[number];

async function seedDomain() {
  // Order respects FKs: rooms → agents, leads → demos/deals/audits.
  await db.insert(rooms).values(AV.rooms).onConflictDoNothing();

  await db
    .insert(agents)
    .values(
      AV.agents.map((a) => {
        const d = AV.agentDetail(a.id)!;
        return {
          ...a,
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

  await db
    .insert(deals)
    .values(AV.deals.map((d) => ({ ...d, stage: d.stage as DealStage })))
    .onConflictDoNothing();

  // Audit per lead — audit() materializes scores/problems/redesign for any lead.
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

  // ActivityItem has no id in the mock; assign a deterministic id + sequence so the
  // ordering survives and re-seeding stays idempotent.
  await db
    .insert(activity)
    .values(AV.activity.map((it, i) => ({ id: `act-${i}`, seq: i, ...it })))
    .onConflictDoNothing();

  await db
    .insert(demoRequests)
    .values(AV.demoRequests.map((r) => ({ ...r, status: r.status as ReqStatus })))
    .onConflictDoNothing();

  await db.insert(metrics).values({ id: 'current', ...AV.metrics }).onConflictDoNothing();

  // Founder control surface. Defaults derived from the mock: $50/day cost ceiling and the
  // $4,000 auto-approve limit referenced in the escalations copy; package prices from deals.
  await db
    .insert(settings)
    .values({
      id: 'default',
      autonomyMode: 'guarded',
      guardrails: { autoApproveLimit: 4000, dailyCostLimit: AV.metrics.costLimit },
      pricing: { landingPage: 900, businessWebsite: 2400 },
    })
    .onConflictDoNothing();
}

async function seedFounder() {
  const email = process.env.FOUNDER_EMAIL ?? 'founder@agentsverse.ai';
  const password = process.env.FOUNDER_PASSWORD ?? 'AgentsVerse!Demo2026';

  // Hash through Better Auth's own context so the stored credential matches exactly what
  // the runtime verifier expects (no scrypt-param drift between seed and login).
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

  await seedDomain();
  const email = await seedFounder();

  const [{ value: leadCount }] = await db.select({ value: count() }).from(leads);
  console.log(`Seed complete. leads=${leadCount}, founder=${email}`);

  await sql.end({ timeout: 5 });
}

void main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
