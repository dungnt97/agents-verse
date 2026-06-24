import { eq, sql } from 'drizzle-orm';
import { inngest, type DealWonData } from '../client';
import { db } from '../../db/client';
import { builds, leads, generatedDemos, audits } from '../../db/schema';
import type { BuildMeta } from '../../db/schema/builds';
import { runAgent } from '../../agents/runner';
import { cipherCoder, type CipherOutput } from '../../agents/defs/cipher-coder';
import { injectSeo, fallbackMeta, localBusinessJsonLd, sitemapXml, robotsTxt } from '../../agents/pipelines/delivery-seo';

// Cipher build-prep (WORKER only — shells `claude`; relative imports, no `server-only`). When a deal is
// WON, it turns that lead's generated demo into a delivery-ready page: Cipher writes SEO/OG metadata
// (JSON, degrades to deterministic metadata without a key) which is injected with a JSON-LD/sitemap into
// the demo HTML and stored in `builds`. Emits `delivery/completed`. Idempotent per lead (upsert + event
// id); decoupled from `pipeline_runs` since deals aren't run-tracked.
const appUrl = () => process.env.APP_URL || process.env.BETTER_AUTH_URL || '';

export const runBuild = inngest.createFunction(
  {
    id: 'run-build',
    retries: 1,
    concurrency: [
      { limit: Number(process.env.CLAUDE_AGENT_CONCURRENCY) || 2 },
      { limit: 1, key: 'event.data.leadId' },
    ],
    triggers: [{ event: 'deal/won' }],
    onFailure: async ({ event, step }) => {
      const { leadId, dealId } = event.data.event.data as DealWonData;
      await step.run('mark-build-failed', async () => {
        await db
          .insert(builds)
          .values({ leadId, dealId, status: 'failed', error: 'build failed' })
          .onConflictDoUpdate({
            target: builds.leadId,
            set: { status: 'failed', error: 'build failed', updatedAt: new Date() },
            // Never demote an already-saved 'ready' build: if save-build committed and only the
            // delivery-event emit failed, the optimized page stays live (don't fall back to the raw demo).
            setWhere: sql`${builds.status} <> 'ready'`,
          });
      });
    },
  },
  async ({ event, step }) => {
    const { dealId, leadId } = event.data as DealWonData;

    const loaded = await step.run('load', async () => {
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      const [demo] = await db.select().from(generatedDemos).where(eq(generatedDemos.leadId, leadId)).limit(1);
      const [audit] = await db.select().from(audits).where(eq(audits.leadId, leadId)).limit(1);
      return {
        company: lead?.company ?? leadId,
        industry: lead?.industry ?? '',
        city: lead?.city ?? '',
        url: lead?.url ?? '',
        summary: audit?.summary ?? '',
        html: demo?.html ?? null,
        demoReady: demo?.status === 'ready',
      };
    });

    // No demo to optimize → record a failed build and stop. (The won deal still triggers Mira onboarding
    // via its own deal/won handler — delivery just has nothing to build yet.)
    if (!loaded.html || !loaded.demoReady) {
      await step.run('mark-no-demo', async () => {
        await db
          .insert(builds)
          .values({ leadId, dealId, status: 'failed', error: 'no ready demo to build' })
          .onConflictDoUpdate({
            target: builds.leadId,
            set: { dealId, status: 'failed', error: 'no ready demo to build', updatedAt: new Date() },
          });
      });
      return { leadId, built: false, reason: 'no ready demo' };
    }

    // SEO metadata — its own memoized step so a later failure doesn't re-spend the claude call. Degrades
    // to deterministic metadata if the claude call is unavailable/fails, so the build always ships.
    const meta = await step.run('seo', async (): Promise<CipherOutput> => {
      try {
        return await runAgent(cipherCoder, {
          company: loaded.company,
          industry: loaded.industry,
          city: loaded.city,
          summary: loaded.summary,
        });
      } catch {
        return fallbackMeta(loaded.company, loaded.industry, loaded.city, loaded.summary);
      }
    });

    const base = appUrl().replace(/\/$/, '');
    const canonical = base ? `${base}/demo/${leadId}` : '';
    const jsonLd = localBusinessJsonLd(loaded.company, loaded.industry, loaded.city, loaded.url);
    const optimized = injectSeo(loaded.html, meta, jsonLd, canonical);
    const buildMeta: BuildMeta = {
      title: meta.title,
      description: meta.description,
      ogTitle: meta.ogTitle,
      ogDescription: meta.ogDescription,
      keywords: meta.keywords,
      sitemap: sitemapXml(canonical),
      robots: robotsTxt(canonical),
    };

    await step.run('save-build', async () => {
      await db
        .insert(builds)
        .values({ leadId, dealId, html: optimized, meta: buildMeta, status: 'ready', error: null })
        .onConflictDoUpdate({
          target: builds.leadId,
          set: { dealId, html: optimized, meta: buildMeta, status: 'ready', error: null, updatedAt: new Date() },
        });
    });

    await step.sendEvent('emit-delivery', {
      name: 'delivery/completed',
      data: { leadId, dealId },
      id: `delivery/completed:${leadId}`,
    });
    return { leadId, built: true };
  },
);
