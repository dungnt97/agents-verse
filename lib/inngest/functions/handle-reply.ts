import { and, eq } from 'drizzle-orm';
import { inngest, type ReplyReceivedData } from '../client';
import { db } from '../../db/client';
import { deals, settings, escalations, leads } from '../../db/schema';
import { runAgent } from '../../agents/runner';
import { closerSales } from '../../agents/defs/closer-sales';
import { demoLanguageForAddress } from '../../demo-gen/locale';
import { isOptOut } from '../../data/opt-out';
import {
  decideReplyOutcome,
  nextStages,
  isTerminalStage,
  DEAL_AUTO_APPROVE_LIMIT,
  type DealStage,
  type AutonomyMode,
} from '../../data/deal-stage-machine';

// Package label for a deal the Closer materializes from a first reply — the founder renames it in the deal.
const NEW_DEAL_PKG = 'Business Website';
const posNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

// Closer sales-brain (WORKER only — shells `claude`; relative imports, no `server-only`). A founder
// pastes a client's reply → this interprets it (sonnet) and routes the recommendation through the deal
// state machine: a legal, confident, in-budget move auto-advances the deal; anything gated (low conf,
// value over threshold, illegal, or manual mode) opens a deal escalation the founder resolves. Three
// layers stop a model mis-step from pushing a deal: the zod DealStage schema, canTransition, and the
// requiresApproval/DEAL_CONF_FLOOR gate (decideReplyOutcome).
export const handleReply = inngest.createFunction(
  {
    id: 'handle-reply',
    retries: 2,
    // Shares the global `claude`-CLI budget with every other claude function (see run-demo-gen) + per-deal
    // serialization. The Closer is a short sonnet call, but it still draws on the same subscription budget.
    concurrency: [
      { scope: 'account', key: '"claude-agent"', limit: Number(process.env.CLAUDE_AGENT_CONCURRENCY) || 2 },
      { limit: 1, key: 'event.data.dealId' },
    ],
    triggers: [{ event: 'reply/received' }],
    // A verified client reply whose interpretation terminally fails must not be lost — the inbound
    // webhook's svix-id dedup blocks re-emission, so this is the reply's last chance to surface.
    // Reuses the esc-reply-<dealId> review flag the success path uses: same founder workflow (read
    // the reply, act in the deals UI), just without an AI interpretation attached.
    onFailure: async ({ event, error, step }) => {
      const { dealId, text } = event.data.event.data as ReplyReceivedData;
      await step.run('escalate-reply-failure', async () => {
        const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
        if (!deal) return;
        const reason = `Automatic interpretation failed (${error.message}) — review the reply manually. Reply: "${text.slice(0, 200)}"`;
        await db
          .insert(escalations)
          .values({
            id: `esc-reply-${dealId}`,
            kind: 'sales',
            sev: 'high',
            title: `Client reply needs review — ${deal.client}`,
            who: deal.client,
            value: deal.value,
            agent: 'closer',
            reason,
            rec: 'Read the reply and advance the deal manually in the deals screen.',
            conf: 0,
            time: 'just now',
            status: 'open',
            dealId,
          })
          .onConflictDoUpdate({
            target: escalations.id,
            set: { status: 'open', resolvedAt: null, reason, conf: 0 },
          });
      });
    },
  },
  async ({ event, step }) => {
    const { dealId, text, leadId } = event.data as ReplyReceivedData;

    // Opt-out short-circuit — before any deal work. A "STOP" reply permanently suppresses future outreach
    // to this lead and resolves any parked draft, so it can never be re-contacted. Only fires on an
    // unambiguous keyword; needs the leadId the inbound webhooks always carry.
    if (leadId && isOptOut(text)) {
      await step.run('honor-opt-out', async () => {
        await db.update(leads).set({ doNotContact: true }).where(eq(leads.id, leadId));
        await db
          .update(escalations)
          .set({ status: 'resolved', resolvedAt: new Date() })
          .where(and(eq(escalations.id, `esc-outreach-${leadId}`), eq(escalations.status, 'open')));
      });
      return { dealId, optedOut: true };
    }

    // Load the deal + live settings INSIDE a memoized step so the decision is stable across Inngest replays
    // (re-reading mutable rows outside a step could re-derive a different decision after our own write).
    // When no deal exists yet, this is the lead's FIRST reply — materialize a deal from the lead (a deal
    // row is otherwise never created for a discovered lead, leaving the whole reply→deal→delivery half of
    // the funnel unreachable). Real facts only: value is Orion's estimate, price the settings ladder.
    const loaded = await step.run('load-deal', async () => {
      const [s] = await db.select().from(settings).limit(1);
      const autonomyMode = (s?.autonomyMode as AutonomyMode | undefined) ?? 'guarded';
      const limitRaw = (s?.guardrails as Record<string, unknown> | null | undefined)?.autoApproveLimit;
      const threshold = typeof limitRaw === 'number' ? limitRaw : DEAL_AUTO_APPROVE_LIMIT;

      const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
      if (deal) {
        // The deal row doesn't store the address; read the lead so the Closer replies in the client's language.
        const [lead] = await db
          .select({ formattedAddress: leads.formattedAddress })
          .from(leads)
          .where(eq(leads.id, deal.leadId))
          .limit(1);
        return {
          create: false as const,
          leadId: deal.leadId,
          client: deal.client,
          industry: deal.industry,
          city: deal.city,
          pkg: deal.pkg,
          value: deal.value,
          stage: deal.stage as DealStage,
          language: demoLanguageForAddress(lead?.formattedAddress),
          autonomyMode,
          threshold,
        };
      }
      if (!leadId) return null;
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      if (!lead) return null;
      const price = posNum((s?.pricing as Record<string, unknown> | null | undefined)?.businessWebsite) ?? lead.value;
      return {
        create: true as const,
        leadId: lead.id,
        client: lead.company,
        industry: lead.industry,
        city: lead.city,
        pkg: NEW_DEAL_PKG,
        value: lead.value,
        price,
        stage: 'created' as DealStage,
        language: demoLanguageForAddress(lead.formattedAddress),
        autonomyMode,
        threshold,
      };
    });
    if (!loaded) return { dealId, skipped: 'no deal and no lead to create one from' };
    // A closed deal (won/lost) has no legal next stage — never act on a late/duplicate reply for it
    // (that previously re-escalated a terminal deal, where a Reject would flip a won deal to lost).
    if (isTerminalStage(loaded.stage)) return { dealId, skipped: `deal already ${loaded.stage}` };

    const legalNextStages = nextStages(loaded.stage);

    // Interpret the reply (the claude call) — its own memoized step so an apply failure never re-spends it.
    const closer = await step.run('interpret', () =>
      runAgent(closerSales, {
        deal: {
          client: loaded.client,
          industry: loaded.industry,
          city: loaded.city,
          pkg: loaded.pkg,
          value: loaded.value,
          stage: loaded.stage,
        },
        legalNextStages,
        text,
        language: loaded.language,
      }),
    );

    // Pure routing from the (memoized) load + interpretation → stable across replays.
    const decision = decideReplyOutcome({
      currentStage: loaded.stage,
      recommendedStage: closer.recommendedStage,
      conf: closer.conf,
      value: loaded.value,
      autonomyMode: loaded.autonomyMode,
      threshold: loaded.threshold,
    });

    const replyRecord = {
      kind: closer.kind,
      message: text,
      interpretation: closer.interpretation,
      suggested: closer.suggested,
    };

    const applied = await step.run('apply', async () => {
      if (loaded.create) {
        // First reply from a lead with no deal → materialize the deal at 'created' and surface it for
        // founder review (a brand-new deal is never auto-advanced on its first message). Idempotent: a
        // redelivery of the same reply finds the row already there and the escalation upsert is a no-op.
        // `probability` is a starting CRM estimate the founder refines — not a claimed business fact.
        await db.transaction(async (tx) => {
          await tx
            .insert(deals)
            .values({
              id: dealId,
              leadId: loaded.leadId,
              client: loaded.client,
              industry: loaded.industry,
              city: loaded.city,
              pkg: loaded.pkg,
              price: loaded.price,
              value: loaded.value,
              probability: 20,
              stage: 'created',
              aiRec: closer.suggested,
              conf: closer.conf,
              reply: replyRecord,
            })
            .onConflictDoNothing({ target: deals.id });
          const reason = `New reply from ${loaded.client} (no prior deal). Reply: "${text.slice(0, 200)}". ${closer.interpretation}`;
          await tx
            .insert(escalations)
            .values({
              id: `esc-reply-${dealId}`,
              kind: 'sales',
              sev: loaded.value >= loaded.threshold ? 'high' : 'medium',
              title: `New client reply — ${loaded.client}`,
              who: loaded.client,
              value: loaded.value,
              agent: 'closer',
              reason,
              rec: closer.suggested,
              conf: closer.conf,
              time: 'just now',
              status: 'open',
              dealId,
            })
            .onConflictDoUpdate({
              target: escalations.id,
              set: { status: 'open', resolvedAt: null, reason, rec: closer.suggested, conf: closer.conf },
            });
        });
        return 'created';
      }

      if (decision.action === 'advance') {
        // Legal + confident + in-budget → move the deal. Conditional on the stage we decided FROM so a
        // concurrent change isn't clobbered. `.returning` tells us if we actually moved it.
        const rows = await db
          .update(deals)
          .set({ stage: decision.toStage, reply: replyRecord, aiRec: closer.suggested, conf: closer.conf })
          .where(and(eq(deals.id, dealId), eq(deals.stage, loaded.stage)))
          .returning({ id: deals.id });
        if (rows.length > 0) return 'advanced';
        // 0 rows → the deal moved under us (a concurrent updateDealStage / re-delivery). Don't drop the
        // reply: fall through to surface it as a review flag for the founder instead of silently losing it.
      }

      // Surface the reply for founder review: record it on the deal + open a SALES-review escalation. This
      // is a flag (resolve/dismiss via the generic action) — NOT a deal-close decision, so it uses its own
      // id namespace (never collides with the threshold `esc-deal-<id>`) and never auto-mutates the deal.
      // The founder reviews the Closer's reading + suggested reply, then advances the deal in the deals UI.
      const reason =
        decision.action === 'escalate'
          ? `${decision.reason}. Reply: "${text.slice(0, 200)}". ${closer.interpretation}`
          : `Deal moved during processing — review manually. Reply: "${text.slice(0, 200)}". ${closer.interpretation}`;
      await db.transaction(async (tx) => {
        await tx
          .update(deals)
          .set({ reply: replyRecord, aiRec: closer.suggested, conf: closer.conf, escReason: closer.interpretation })
          .where(eq(deals.id, dealId));
        await tx
          .insert(escalations)
          .values({
            id: `esc-reply-${dealId}`,
            kind: 'sales',
            sev: loaded.value >= loaded.threshold ? 'high' : 'medium',
            title: `Client reply needs review — ${loaded.client}`,
            who: loaded.client,
            value: loaded.value,
            agent: 'closer',
            reason,
            rec: closer.suggested,
            conf: closer.conf,
            time: 'just now',
            status: 'open',
            dealId,
          })
          .onConflictDoUpdate({
            target: escalations.id,
            set: { status: 'open', resolvedAt: null, reason, rec: closer.suggested, conf: closer.conf, value: loaded.value },
          });
      });
      return 'escalated';
    });

    // The Closer auto-closed the deal (only reachable under full autonomy) → kick off post-sale delivery
    // (Cipher build-prep + Mira onboarding), id-deduped per deal.
    if (applied === 'advanced' && decision.action === 'advance' && decision.toStage === 'won') {
      await step.sendEvent('emit-deal-won', {
        name: 'deal/won',
        data: { dealId, leadId: loaded.leadId },
        id: `deal/won:${dealId}`,
      });
    }

    return { dealId, applied, recommendedStage: closer.recommendedStage, conf: closer.conf };
  },
);
