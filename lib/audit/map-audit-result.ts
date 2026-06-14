// Merge PageSpeed (speed/seo/mobile) + Gemini vision (visual/cta/trust/content/conversion) +
// the lead into the audit row shape stored in the `audits` table. `redesign` keeps the
// industry-derived value from buildAuditFor (v1); confidence reflects PSI category coverage.
// Relative imports — this runs in the worker under tsx (the `@/` alias isn't resolved there).
import { buildAuditFor } from '../data';
import type { Lead, ScoreProfile, Redesign } from '../data/types';
import type { PageSpeedResult } from './pagespeed-client';
import type { VisionScore } from './vision-scoring';

export interface MappedAudit {
  scores: ScoreProfile;
  problems: string[];
  redesign: Redesign;
  confidence: number;
  summary: string;
}

export function mapAuditResult(opts: { lead: Lead; psi: PageSpeedResult; vision: VisionScore }): MappedAudit {
  const { lead, psi, vision } = opts;
  const derived = buildAuditFor(lead); // industry-derived redesign + summary fallback

  const scores: ScoreProfile = {
    speed: psi.speed,
    seo: psi.seo,
    mobile: psi.mobile,
    visual: vision.visual,
    cta: vision.cta,
    trust: vision.trust,
    content: vision.content,
    conversion: vision.conversion,
  };

  const problems = [...vision.problems, ...psi.problems].slice(0, 8);

  const cats = psi.categoryScores;
  const present = [cats.performance, cats.seo, cats.accessibility, cats.bestPractices].filter(
    (v) => v != null,
  ).length;
  // More PSI categories returned + a real vision summary → higher confidence (cap 97).
  const confidence = Math.min(97, 60 + present * 8 + (vision.summary ? 5 : 0));

  return {
    scores,
    problems,
    redesign: derived.redesign,
    confidence,
    summary: vision.summary || derived.summary,
  };
}
