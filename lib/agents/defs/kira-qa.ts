// Kira — Visual QA. The dashboard-named board member for the art-direction / brand-craft lens (bespoke
// vs templated, AI-tell detection, the "would this win the pitch" bar). Wraps the demo-gen 'art' persona.
import { personaByKey, reviewDef } from './review-persona';

export const kiraReview = reviewDef('kira', 'Visual QA — brand craft, AI-tell detection, pass/hold', personaByKey('art'));
