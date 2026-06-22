// Iris — UX Reviewer. The dashboard-named board member for the UI/UX lens (visual hierarchy, layout &
// spacing discipline, mobile usability, conversion UX). Wraps the demo-gen 'uiux' persona.
import { personaByKey, reviewDef } from './review-persona';

export const irisReview = reviewDef('iris', 'UX Reviewer — hierarchy, spacing discipline, mobile usability', personaByKey('uiux'));
