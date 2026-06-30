'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { assistantConfigured, completeText } from '@/lib/integrations/assistant';
import { getMetrics, getOpenEscalations } from '@/lib/repositories/ops';
import { USE_DB } from '@/lib/repositories/config';

export interface SummaryResult {
  ok: boolean;
  text: string;
}

// Real AI summary for the workspace "Ask AI summary" / "Daily briefing" buttons. Calls the sonnet gateway
// with a tight 2-sentence prompt built from the live metrics + open escalations. Auth- and gateway-gated;
// degrades to a clear message when the assistant isn't configured.
export async function requestSummary(input: { kind: string; label?: string }): Promise<SummaryResult> {
  if (!(await getCurrentUser())) throw new Error('Unauthorized');
  if (!assistantConfigured()) {
    return { ok: false, text: 'AI summary needs the assistant gateway (ANTHROPIC_BASE_URL + AGENT_MODEL_SONNET) — not configured.' };
  }
  let context = input.label ? input.label + '. ' : '';
  if (USE_DB) {
    try {
      const [m, esc] = await Promise.all([getMetrics(), getOpenEscalations()]);
      context +=
        `Open escalations: ${esc.length}` +
        (esc.length ? ' (' + esc.slice(0, 5).map((e) => e.title).join('; ') + ')' : '') +
        `. Leads ${m.leads}, demos ready ${m.demos}, client replies ${m.replies}, deals won ${m.won}, ` +
        `revenue forecast $${m.forecast}, AI cost today $${m.cost}, net profit $${m.netProfit}.`;
    } catch {
      /* keep whatever context we built */
    }
  }
  const prompt =
    `You are the founder's chief of staff at an autonomous web-design agency. In TWO short, concrete ` +
    `sentences (no preamble, no markdown, no lists), summarize the current state and name the single most ` +
    `important next action.\n\nState: ${context || 'the current workspace'}`;
  try {
    const text = (await completeText(prompt, { maxTokens: 220 })).trim();
    return text ? { ok: true, text: text.slice(0, 480) } : { ok: false, text: 'No summary returned — try again.' };
  } catch {
    return { ok: false, text: 'Could not generate the summary right now — try again shortly.' };
  }
}
