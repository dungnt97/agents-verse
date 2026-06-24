// Worker process entrypoint (CMD of Dockerfile.worker, run via tsx). Registers the audit
// function with the self-hosted Inngest server over an OUTBOUND connection (connect()), so the
// worker needs no inbound port. This is the ONLY place runAudit is registered — the web app
// merely sends events, keeping playwright/gemini out of the web build.
import { connect } from 'inngest/connect';
import { inngest } from './client';
import { runAudit } from './functions/run-audit';
import { runDemoGen } from './functions/run-demo-gen';
import { orchestratePipeline } from './functions/orchestrate-pipeline';
import { closeBrowser } from '../audit/screenshot';
// NOTE: the Postgres pool is drained by lib/db/client.ts's own SIGTERM handler (imported
// transitively via run-audit). This entrypoint only owns the Inngest connection + the browser,
// so we don't call sql.end() here (avoids a double-close).

async function main(): Promise<void> {
  const connection = await connect({
    apps: [{ client: inngest, functions: [runAudit, runDemoGen, orchestratePipeline] }],
  });
  console.log('[worker] connected to Inngest; audit + demo + orchestrator functions registered');

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void (async () => {
        await connection.close().catch(() => {});
        await closeBrowser();
        process.exit(0);
      })();
    });
  }
}

void main().catch((err) => {
  console.error('[worker] failed to start:', err);
  process.exit(1);
});
