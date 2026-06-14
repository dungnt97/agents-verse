// The vision-scoring prompt. Kept separate so the rubric can be tuned without touching the SDK
// call. Calibrated 0-100 bands keep Gemini's scores consistent across runs.
export function buildVisionPrompt(opts: { company: string; industry: string }): string {
  return [
    `You are a senior web-design and conversion auditor reviewing the homepage of "${opts.company}", a ${opts.industry} business.`,
    `You are shown two screenshots: first DESKTOP, then MOBILE.`,
    ``,
    `Score each dimension 0-100 (higher = better), calibrated:`,
    `  0-40 poor · 40-60 mediocre · 60-80 decent · 80-100 excellent.`,
    `- visual: overall visual design quality, layout, hierarchy, modernity, imagery.`,
    `- cta: clarity and prominence of the primary call-to-action (above the fold, obvious, compelling).`,
    `- trust: trust signals present — reviews, ratings, credentials, guarantees, professional polish.`,
    `- content: clarity, quality and relevance of the copy for a ${opts.industry} visitor.`,
    `- conversion: overall likelihood this page converts a visitor into a lead/customer.`,
    ``,
    `Also return:`,
    `- problems: 3-6 specific, actionable issues (short strings).`,
    `- summary: 1-2 sentences describing the site's biggest redesign opportunity.`,
    `Be consistent and objective. Return ONLY the JSON object matching the schema.`,
  ].join('\n');
}
