import 'server-only';
import { desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auditJobs, generatedDemos, leads } from '@/lib/db/schema';
import type { Agent } from '@/lib/data/types';
import { USE_DB } from './config';

// Live overlay that makes the agent dashboard reflect REAL subsystem activity instead of static
// seed data. Only agents whose discipline maps to a BUILT subsystem are made live — audit
// (`audit_jobs`), demo generation (`generated_demos`) and lead discovery (`leads`). Every other
// agent keeps its seeded showcase values, because its subsystem (support / outreach / sales /
// finance) is not implemented yet. We overlay only the honest, derivable signals — status, the
// current task line, and today's task count — and leave the vanity quality/cost numbers alone.
type Overlay = Partial<Pick<Agent, 'status' | 'task' | 'tasks'>>;

// Per-agent task verbs so a busy pipeline reads naturally instead of repeating one line.
const DEMO_TASK: Record<string, (company: string) => string> = {
  nova: (c) => `Designing the ${c} demo homepage`,
  cipher: (c) => `Building the ${c} demo page`,
  iris: (c) => `Reviewing UX of the ${c} demo`,
  atlas: (c) => `Shaping brand direction for ${c}`,
};
const AUDIT_TASK: Record<string, (company: string) => string> = {
  vega: (c) => `Auditing ${c}`,
  kira: (c) => `Visual QA on the ${c} audit`,
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAgentActivity(): Promise<Record<string, Overlay>> {
  if (!USE_DB) return {};
  const today = startOfToday();
  const out: Record<string, Overlay> = {};

  // --- Demo generation → the design-room pipeline agents ---
  const demos = await db
    .select({ status: generatedDemos.status, company: leads.company, updatedAt: generatedDemos.updatedAt })
    .from(generatedDemos)
    .leftJoin(leads, eq(leads.id, generatedDemos.leadId))
    .orderBy(desc(generatedDemos.updatedAt));
  if (demos.length) {
    const active = demos.find((d) => d.status === 'generating');
    const failed = demos.find((d) => d.status === 'failed');
    const todayN = demos.filter((d) => d.updatedAt >= today).length;
    const company = (active ?? failed ?? demos[0]).company ?? 'a lead';
    const status = active ? 'working' : failed ? 'needs review' : 'idle';
    for (const [id, verb] of Object.entries(DEMO_TASK)) {
      out[id] = {
        status,
        tasks: todayN,
        task: active ? verb(company) : failed ? `Demo build failed — ${company}` : `Idle · last demo: ${company}`,
      };
    }
  }

  // --- Website audit → the audit/critic agents ---
  const audits = await db
    .select({ status: auditJobs.status, company: leads.company, updatedAt: auditJobs.updatedAt })
    .from(auditJobs)
    .leftJoin(leads, eq(leads.id, auditJobs.leadId))
    .orderBy(desc(auditJobs.updatedAt));
  if (audits.length) {
    const active = audits.find((a) => a.status === 'running' || a.status === 'queued');
    const failed = audits.find((a) => a.status === 'failed');
    const todayN = audits.filter((a) => a.updatedAt >= today).length;
    const company = (active ?? failed ?? audits[0]).company ?? 'a lead';
    const status = active ? 'working' : failed ? 'needs review' : 'idle';
    for (const [id, verb] of Object.entries(AUDIT_TASK)) {
      out[id] = {
        status,
        tasks: todayN,
        task: active ? verb(company) : failed ? `Audit failed — ${company}` : `Idle · last audit: ${company}`,
      };
    }
  }

  // --- Lead discovery → Orion (Lead Hunter). Only real Places-sourced leads carry a placeId. ---
  const discovered = await db
    .select({ company: leads.company })
    .from(leads)
    .where(isNotNull(leads.placeId));
  if (discovered.length) {
    out.orion = {
      status: 'working',
      tasks: discovered.length,
      task: `Discovered ${discovered.length} leads · latest ${discovered[0].company}`,
    };
  }

  return out;
}
