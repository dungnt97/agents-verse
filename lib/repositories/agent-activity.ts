import 'server-only';
import { count, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { auditJobs, generatedDemos, leads, escalations, pipelineRuns } from '@/lib/db/schema';
import { ACTIVE_RUN_STATUSES, type PipelineStage } from '@/lib/inngest/pipeline-machine';
import { estCost } from '@/lib/data/agent-rates';
import type { Agent } from '@/lib/data/types';
import { USE_DB } from './config';

// Live overlay that makes the agent dashboard reflect REAL subsystem activity instead of static seed
// data. Every built subsystem feeds the agents that own it: audit (`audit_jobs`), demo generation
// (`generated_demos`), lead discovery (`leads.placeId`), outreach/sales/finance/support (their open
// `escalations`), and the central `pipeline_runs` ledger (which agent currently drives which lead).
// We overlay the honest, derivable signals — status, the current task line, today's task count, and an
// ESTIMATED per-agent spend (counts × the per-unit rate) for agents with a clean countable unit. Agents
// without a real counter (closer/mira/ledger spend) keep their seeded cost.
type Overlay = Partial<Pick<Agent, 'status' | 'task' | 'tasks' | 'cost'>>;

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

// The agent that owns each pipeline stage — drives the "who is driving this lead right now" overlay.
const STAGE_AGENT: Record<PipelineStage, string> = {
  audit: 'vega',
  demo: 'nova',
  outreach: 'echo',
  reply: 'closer',
  deal: 'closer',
  delivery: 'cipher',
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
  // Merge (don't replace) so status/task/cost accumulate across the overlays below.
  const set = (id: string, o: Overlay) => {
    out[id] = { ...out[id], ...o };
  };

  // --- Central pipeline ledger → who currently drives each in-flight lead (base layer) ---
  const runs = await db
    .select({ stage: pipelineRuns.stage, status: pipelineRuns.status, company: leads.company })
    .from(pipelineRuns)
    .leftJoin(leads, eq(leads.id, pipelineRuns.leadId))
    .where(inArray(pipelineRuns.status, [...ACTIVE_RUN_STATUSES]))
    .orderBy(desc(pipelineRuns.updatedAt));
  for (const r of runs) {
    const agent = STAGE_AGENT[r.stage as PipelineStage];
    if (!agent || out[agent]) continue; // first (newest) run wins per agent
    const company = r.company ?? 'a lead';
    set(agent, {
      status: r.status === 'waiting_approval' ? 'review' : 'working',
      task: r.status === 'waiting_approval' ? `Awaiting approval — ${company}` : `Driving the ${company} pipeline`,
    });
  }

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
      set(id, {
        status,
        tasks: todayN,
        task: active ? verb(company) : failed ? `Demo build failed — ${company}` : `Idle · last demo: ${company}`,
        cost: estCost(todayN, id),
      });
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
      set(id, {
        status,
        tasks: todayN,
        task: active ? verb(company) : failed ? `Audit failed — ${company}` : `Idle · last audit: ${company}`,
        cost: estCost(todayN, id),
      });
    }
  }

  // --- Lead discovery → Orion (Lead Hunter). Only real Places-sourced leads carry a placeId. ---
  const discovered = await db.select({ company: leads.company }).from(leads).where(isNotNull(leads.placeId));
  if (discovered.length) {
    set('orion', {
      status: 'working',
      tasks: discovered.length,
      task: `Discovered ${discovered.length} leads · latest ${discovered[0].company}`,
      cost: estCost(discovered.length, 'orion'),
    });
  }

  // --- Outreach / sales / finance / support → driven by their open escalations + outreach counters ---
  const open = await db
    .select({ kind: escalations.kind, who: escalations.who, title: escalations.title })
    .from(escalations)
    .where(eq(escalations.status, 'open'));
  const firstOf = (kind: string) => open.find((e) => e.kind === kind);

  // Echo (outreach): count of leads already emailed; status from any open outreach draft.
  const [{ sent }] = await db.select({ sent: count() }).from(leads).where(eq(leads.demo, 'sent'));
  const outreachEsc = firstOf('outreach');
  set('echo', {
    status: outreachEsc ? 'review' : Number(sent) > 0 ? 'working' : 'idle',
    task: outreachEsc
      ? `Outreach draft awaiting review — ${outreachEsc.who}`
      : Number(sent) > 0
        ? `${sent} outreach email${Number(sent) === 1 ? '' : 's'} sent`
        : 'Idle · awaiting ready demos',
    tasks: Number(sent),
    cost: estCost(Number(sent), 'echo'),
  });

  // Closer (sales): open sales/deal escalation → reviewing a reply.
  const salesEsc = firstOf('sales') ?? firstOf('deal');
  if (salesEsc) set('closer', { status: 'escalate', task: `Client reply needs review — ${salesEsc.who}` });

  // Ledger (finance): the per-day cost escalation it raises is its own live signal.
  const costEsc = firstOf('cost');
  set('ledger', {
    status: costEsc ? 'review' : 'idle',
    task: costEsc ? costEsc.title : 'Estimating daily AI spend',
  });

  // Mira (support): open support request → working with the client.
  const supportEsc = firstOf('support');
  if (supportEsc) set('mira', { status: 'working', task: `Support request — ${supportEsc.who}` });

  return out;
}
