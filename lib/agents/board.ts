// The niche-aware expert review board — four independent lenses over the rendered screenshots, in the
// SAME order the single-pass engine used (uiux → copy → niche → art) so the synthesis pass sees
// identical input. Iris (uiux) and Kira (art) are the dashboard-named members; copy/niche are
// board-internal sub-lenses. tsx-safe: relative imports, no `server-only`.
import type { AgentDef } from './types';
import { irisReview } from './defs/iris-ux';
import { kiraReview } from './defs/kira-qa';
import { personaByKey, reviewDef, type ReviewInput } from './defs/review-persona';

export const REVIEW_BOARD: AgentDef<ReviewInput, string>[] = [
  irisReview,
  reviewDef('copy', 'Conversion Copywriter — value-prop, CTA, fluent local Vietnamese', personaByKey('copy')),
  reviewDef('niche', 'Domain Expert — category must-haves and credibility', personaByKey('niche')),
  kiraReview,
];
