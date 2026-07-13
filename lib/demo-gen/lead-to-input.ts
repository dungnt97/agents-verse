import { demoLanguageForAddress } from './locale';
import type { DemoGenInput } from './prompt';
import type { leads, audits } from '../db/schema';

// Maps a persisted lead row + its audit row into the DemoGenInput the pipeline builds from. Extracted out
// of the Inngest function so it can be unit-tested in isolation: the demo must NEVER invent a business
// fact, so the real phone / address / Maps facts have to survive this hop verbatim (a null stays null and
// is omitted downstream, never replaced with a placeholder). A regression here once shipped a fabricated
// phone number, and nothing but a test can catch it. Worker-safe (relative imports, no `server-only`).
export function leadToDemoGenInput(
  lead: typeof leads.$inferSelect,
  audit: typeof audits.$inferSelect,
): DemoGenInput {
  return {
    company: lead.company,
    industry: lead.industry,
    city: lead.city,
    url: lead.url,
    language: demoLanguageForAddress(lead.formattedAddress),
    scores: audit.scores,
    problems: audit.problems,
    redesign: audit.redesign,
    summary: audit.summary,
    // Real contact facts — copied verbatim, null passed through untouched (the prompt omits an absent
    // field rather than inventing one). Never derive or default these.
    phone: lead.phone,
    address: lead.formattedAddress,
    mapsData: lead.mapsData,
  };
}
