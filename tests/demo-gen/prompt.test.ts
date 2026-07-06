import { describe, it, expect } from 'vitest';
import {
  buildResearchPrompt,
  buildConceptPrompt,
  buildDirectorPrompt,
  buildBuildPrompt,
  buildRevisePrompt,
  buildLayoutFixPrompt,
  buildQaFixPrompt,
  buildPersonaReviewPrompt,
  buildReviewSynthesisPrompt,
  REVIEW_PERSONAS,
  type DemoGenInput,
  type ReviewPersona,
} from '@/lib/demo-gen/prompt';

// A fully-populated valid input used across the suite. `scores` is a ScoreProfile object and
// `redesign` is a Redesign object — these are the only shapes the module actually reads.
function makeInput(overrides: Partial<DemoGenInput> = {}): DemoGenInput {
  return {
    company: 'Sunrise Realty',
    industry: 'real estate',
    city: 'Da Nang',
    url: 'https://sunrise-realty.example',
    language: 'English',
    scores: {
      visual: 40,
      mobile: 55,
      cta: 30,
      trust: 70,
      seo: 80,
      speed: 25,
      content: 60,
      conversion: 35,
    },
    problems: ['Slow hero image', 'No mobile menu', 'Weak CTA copy'],
    redesign: {
      style: 'Soft Structuralism',
      sections: ['Hero', 'Listings', 'About', 'Contact'],
      cta: 'Đặt lịch xem nhà',
      content: 'confident yet warm',
      template: 'property',
    },
    summary: 'Outdated layout with poor performance and a buried call to action.',
    ...overrides,
  };
}

describe('REVIEW_PERSONAS', () => {
  it('exports exactly the four expected personas with stable keys', () => {
    expect(Array.isArray(REVIEW_PERSONAS)).toBe(true);
    expect(REVIEW_PERSONAS).toHaveLength(4);
    expect(REVIEW_PERSONAS.map((p) => p.key)).toEqual(['uiux', 'copy', 'niche', 'art']);
  });

  it('each persona exposes a brief() returning a non-empty string', () => {
    const input = makeInput();
    for (const persona of REVIEW_PERSONAS) {
      expect(typeof persona.brief).toBe('function');
      const text = persona.brief(input);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('uiux persona states standards and protects intentional whitespace', () => {
    const text = REVIEW_PERSONAS[0].brief(makeInput());
    expect(text).toContain('SENIOR UI/UX DESIGNER');
    expect(text).toContain('intentional asymmetric negative space');
    expect(text).toContain('do NOT flag them');
    expect(text).toContain('WRAPS OR OVERFLOWS');
  });

  it('copy persona interpolates city and industry', () => {
    const input = makeInput({ city: 'Hue', industry: 'boutique hotel' });
    const text = REVIEW_PERSONAS[1].brief(input);
    expect(text).toContain('CONVERSION COPYWRITER');
    expect(text).toContain('native to the Hue market');
    expect(text).toContain('local boutique hotel customer');
  });

  it('niche persona upper-cases the industry and forbids genericizing', () => {
    const input = makeInput({ industry: 'dental clinic', city: 'Hanoi' });
    const text = REVIEW_PERSONAS[2].brief(input);
    expect(text).toContain('DENTAL CLINIC DOMAIN EXPERT');
    expect(text).toContain('Hanoi customers');
    expect(text).toContain('NEVER recommend making the styling more conventional');
  });

  it('art persona names the generic-template regression as the #1 blocker', () => {
    const input = makeInput({ industry: 'cafe' });
    const text = REVIEW_PERSONAS[3].brief(input);
    expect(text).toContain('ART DIRECTOR');
    expect(text).toContain('REGRESSION TO A GENERIC CATEGORY TEMPLATE');
    expect(text).toContain('could be any cafe brand');
    expect(text).toContain('BOLDER');
  });
});

describe('buildResearchPrompt', () => {
  it('embeds brand, industry, city and audit summary', () => {
    const input = makeInput();
    const out = buildResearchPrompt(input, []);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('"Sunrise Realty"');
    expect(out).toContain('real estate');
    expect(out).toContain('Da Nang');
    expect(out).toContain(input.summary);
    expect(out).toContain('CLIENT REALITY');
    expect(out).toContain('REFERENCE BAR');
    expect(out).toContain('Output ONLY the brief');
  });

  it('lists each provided current-site screenshot path when present', () => {
    const out = buildResearchPrompt(makeInput(), ['/shots/a.png', '/shots/b.png']);
    expect(out).toContain('current-site shot 1: /shots/a.png');
    expect(out).toContain('current-site shot 2: /shots/b.png');
    expect(out).not.toContain('screenshot unavailable');
  });

  it('falls back to the unavailable note when no screenshots are given', () => {
    const out = buildResearchPrompt(makeInput(), []);
    expect(out).toContain('current-site screenshot unavailable');
    expect(out).not.toContain('current-site shot 1:');
  });
});

describe('clientBlock (via prompts that embed it)', () => {
  it('renders the four weakest score dimensions, sorted ascending, with all problems and the brief', () => {
    const input = makeInput();
    // Embedded inside concept/director/build prompts.
    const out = buildBuildPrompt(input, 'SPEC TEXT HERE');

    expect(out).toContain('CLIENT: Sunrise Realty — real estate, Da Nang.');
    expect(out).toContain("Current site we're replacing: https://sunrise-realty.example");
    expect(out).toContain('Audit summary: ' + input.summary);

    // Weakest four: speed 25, cta 30, conversion 35, visual 40 (ascending order).
    expect(out).toContain('Weakest dimensions to visibly fix: speed 25/100, cta 30/100, conversion 35/100, visual 40/100.');

    // All problems appear as bullet lines.
    for (const p of input.problems) {
      expect(out).toContain(`- ${p}`);
    }

    // The redesign brief line.
    expect(out).toContain('CTA "Đặt lịch xem nhà"');
    expect(out).toContain('tone "confident yet warm"');
    expect(out).toContain('sections: Hero, Listings, About, Contact');
  });

  it('handles an empty problems list without emitting stray bullets for problems', () => {
    const input = makeInput({ problems: [] });
    const out = buildBuildPrompt(input, 'SPEC');
    expect(out).toContain('Problems found:');
    // The redesign brief line still renders after an empty problems block.
    expect(out).toContain('Honor this brief from the audit');
  });
});

describe('buildConceptPrompt', () => {
  const input = makeInput();

  it('always contains the core directive scaffolding and inputs', () => {
    const out = buildConceptPrompt(input, '');
    expect(out).toContain('You are the creative director at an Awwwards-tier studio');
    expect(out).toContain('Sunrise Realty');
    expect(out).toContain('THREE genuinely DIFFERENT concepts');
    expect(out).toContain('<<<WINNER>>>');
    expect(out).toContain('BOLDNESS FLOOR');
    // clientBlock is embedded.
    expect(out).toContain('CLIENT: Sunrise Realty — real estate, Da Nang.');
  });

  it('includes the research brief block when a brief is supplied', () => {
    const brief = '  CLIENT REALITY: brass + ivory palette  ';
    const out = buildConceptPrompt(input, brief);
    expect(out).toContain('=== RESEARCH BRIEF (real brand + references) ===');
    // brief is trimmed.
    expect(out).toContain('CLIENT REALITY: brass + ivory palette\n=== END ===');
  });

  it('omits the research brief block when the brief is blank or whitespace', () => {
    const out = buildConceptPrompt(input, '   \n  ');
    expect(out).not.toContain('=== RESEARCH BRIEF (real brand + references) ===');
  });

  it('includes the aesthetic provocation lane when provided (default param exercised separately)', () => {
    const out = buildConceptPrompt(input, 'brief here', 'brutalist neon');
    expect(out).toContain('AESTHETIC PROVOCATION for THIS pitch');
    expect(out).toContain('brutalist neon');
  });

  it('omits the provocation when the style argument is the empty-string default', () => {
    const out = buildConceptPrompt(input, 'brief here');
    expect(out).not.toContain('AESTHETIC PROVOCATION for THIS pitch');
  });
});

describe('buildDirectorPrompt', () => {
  const input = makeInput();

  it('contains the studio bar, art-direction archetypes and locked decisions', () => {
    const out = buildDirectorPrompt(input, '');
    expect(out).toContain('You are the creative director at a top studio');
    expect(out).toContain('COMMIT TO ONE BOLD ART DIRECTION');
    expect(out).toContain('Ethereal Glass');
    expect(out).toContain('Soft Structuralism');
    expect(out).toContain('Vivid Modern');
    expect(out).toContain('Brutalist-Lite');
    expect(out).toContain('Refined Editorial');
    expect(out).toContain('TWO DIFFERENT Google Fonts');
    expect(out).toContain('SELF-CHECK before finishing');
    // industry interpolation in the blueprint + copy lines.
    expect(out).toContain('a real real estate customer expects');
    expect(out).toContain('natural English for Da Nang');
    // clientBlock embedded.
    expect(out).toContain('CLIENT: Sunrise Realty — real estate, Da Nang.');
  });

  it('includes the research-brief block and carry-real-brand instruction when a brief is given', () => {
    const out = buildDirectorPrompt(input, '  benchmark: Aesop, Stripe  ');
    expect(out).toContain('=== RESEARCH BRIEF (ground your design in this');
    expect(out).toContain('benchmark: Aesop, Stripe\n=== END RESEARCH BRIEF ===');
    expect(out).toContain('Carry the client');
  });

  it('omits the research-brief block when no brief is supplied', () => {
    const out = buildDirectorPrompt(input, '');
    expect(out).not.toContain('=== RESEARCH BRIEF (ground your design in this');
  });

  it('includes the chosen-concept block when a concept is supplied', () => {
    const out = buildDirectorPrompt(input, '', '  Concept: scroll-driven listings tour  ');
    expect(out).toContain('=== CHOSEN CONCEPT — EXECUTE THIS');
    expect(out).toContain('Concept: scroll-driven listings tour\n=== END CONCEPT ===');
  });

  it('derives the art direction from the concept (not the closed archetype menu) when a concept is given', () => {
    const withConcept = buildDirectorPrompt(input, '', 'a bold scroll-narrative concept');
    // The archetype list becomes a fallback vocabulary, not the primary instruction.
    expect(withConcept).toContain("derive it from the CHOSEN CONCEPT's OWN visual language");
    expect(withConcept).toContain('only a fallback vocabulary');
    // Without a concept, the director still picks from the archetype menu directly.
    const noConcept = buildDirectorPrompt(input, '');
    expect(noConcept).toContain('Pick the ONE archetype below that genuinely fits this brand');
  });

  it('states the flat-background policy consistently (intentional flat colour is allowed)', () => {
    const out = buildDirectorPrompt(input, '');
    // Rule 2 + the self-check both allow an intentional bold flat colour — only an ACCIDENTAL empty fill fails.
    expect(out).toContain('an intentional bold flat colour block — never an accidental empty flat fill');
    expect(out).toContain('an intentional bold flat colour), not an accidental empty fill?');
  });

  it('omits the chosen-concept block (default param) when no concept is supplied', () => {
    const out = buildDirectorPrompt(input, 'brief');
    expect(out).not.toContain('=== CHOSEN CONCEPT — EXECUTE THIS');
  });

  it('supports both research brief and concept present together', () => {
    const out = buildDirectorPrompt(input, 'a real brief', 'a real concept');
    expect(out).toContain('=== RESEARCH BRIEF (ground your design in this');
    expect(out).toContain('=== CHOSEN CONCEPT — EXECUTE THIS');
  });
});

describe('buildBuildPrompt', () => {
  const input = makeInput();

  it('wraps the spec, embeds the client block and the craft constraints', () => {
    const spec = 'PALETTE: ink + ivory + one coral accent.';
    const out = buildBuildPrompt(input, spec);
    expect(out).toContain('You are a world-class front-end engineer');
    expect(out).toContain('=== DESIGN SPEC ===');
    expect(out).toContain(spec);
    expect(out).toContain('=== END SPEC ===');
    // craftConstraints fingerprints.
    expect(out).toContain('ONE complete self-contained HTML5 document');
    expect(out).toContain('SURFACE & DEPTH');
    expect(out).toContain('SIGNATURE MUST BE VISIBLE');
    expect(out).toContain('STRUCTURE MANDATE');
    expect(out).toContain('NEVER (instant AI / dated tells)');
    // CTA + brand interpolation inside constraints.
    expect(out).toContain('Make the CTA "Đặt lịch xem nhà" unmissable');
    expect(out).toContain('Keep the brand name "Sunrise Realty"');
    expect(out).toContain('fluent, specific English for Da Nang');
  });
});

describe('buildPersonaReviewPrompt', () => {
  const input = makeInput();
  const persona: ReviewPersona = REVIEW_PERSONAS[0];

  it('lists single desktop and mobile shots without slice numbering', () => {
    const out = buildPersonaReviewPrompt(persona, input, ['/d/desk.png'], ['/m/mob.png'], 1440, 375);
    expect(out).toContain('VIEW EVERY screenshot');
    expect(out).toContain('"Sunrise Realty"');
    expect(out).toContain('- Desktop (1440px): /d/desk.png');
    expect(out).toContain('- Mobile (375px): /m/mob.png');
    expect(out).not.toContain('slice 1/');
    // persona brief embedded.
    expect(out).toContain('SENIOR UI/UX DESIGNER');
    // expected sections coverage.
    expect(out).toContain('Expected sections: Hero, Listings, About, Contact');
  });

  it('renders ordered top→bottom slices when multiple screenshots are supplied', () => {
    const out = buildPersonaReviewPrompt(
      persona,
      input,
      ['/d/1.png', '/d/2.png'],
      ['/m/1.png', '/m/2.png', '/m/3.png'],
      1440,
      390,
    );
    expect(out).toContain('Desktop (1440px) slice 1/2 (top→bottom): /d/1.png');
    expect(out).toContain('Desktop (1440px) slice 2/2 (top→bottom): /d/2.png');
    expect(out).toContain('Mobile (390px) slice 1/3 (top→bottom): /m/1.png');
    expect(out).toContain('Mobile (390px) slice 3/3 (top→bottom): /m/3.png');
  });

  it('emits "(none)" placeholder when a viewport has no screenshots', () => {
    const out = buildPersonaReviewPrompt(persona, input, [], [], 1280, 360);
    expect(out).toContain('- Desktop (1280px): (none)');
    expect(out).toContain('- Mobile (360px): (none)');
  });

  it('embeds whichever persona brief is passed in', () => {
    const out = buildPersonaReviewPrompt(REVIEW_PERSONAS[3], input, ['/d.png'], ['/m.png'], 1440, 375);
    expect(out).toContain('ART DIRECTOR');
  });
});

describe('buildReviewSynthesisPrompt', () => {
  const input = makeInput();

  it('numbers each review block and caps the fix list, leading with distinctiveness', () => {
    const reviews = ['UIUX notes', 'Copy notes', 'Niche notes'];
    const out = buildReviewSynthesisPrompt(input, reviews);
    expect(out).toContain('design director consolidating');
    expect(out).toContain('Sunrise Realty');
    expect(out).toContain('=== REVIEW 1 ===\nUIUX notes');
    expect(out).toContain('=== REVIEW 2 ===\nCopy notes');
    expect(out).toContain('=== REVIEW 3 ===\nNiche notes');
    expect(out).toContain('AT MOST 6 fixes');
    expect(out).toContain('biggest DISTINCTIVENESS blocker');
    // Identity is protected, but legibility/contrast/broken-layout fixes stay mandatory even when quieter.
    expect(out).toContain("never soften the page's IDENTITY");
    expect(out).toContain('legibility, contrast, and broken-layout fixes are MANDATORY');
    expect(out).toContain('Output ONLY the fix list');
  });

  it('handles an empty reviews array gracefully', () => {
    const out = buildReviewSynthesisPrompt(input, []);
    expect(out).not.toContain('=== REVIEW 1 ===');
    expect(out).toContain('AT MOST 6 fixes');
  });
});

describe('buildRevisePrompt', () => {
  const input = makeInput();
  const html = '<!doctype html><html><body>old</body></html>';

  it('embeds the fixes, the current HTML, the regression guard and craft constraints', () => {
    const out = buildRevisePrompt(input, '1. Bolder hero', ['/d.png'], ['/m.png'], html);
    expect(out).toContain('senior designer + front-end engineer revising');
    expect(out).toContain('Sunrise Realty');
    expect(out).toContain('1. Bolder hero');
    expect(out).toContain('REGRESSION GUARD');
    expect(out).toContain('VERIFICATION');
    expect(out).toContain('=== CURRENT HTML (revise this) ===');
    expect(out).toContain(html);
    expect(out).toContain('=== END CURRENT HTML ===');
    // craftConstraints fingerprint appears in revise too.
    expect(out).toContain('ONE complete self-contained HTML5 document');
    // The reviser HAS a Read tool: the OUTPUT rule tells it to use it, and the old contradictory
    // "do NOT call any tools" (written for the tool-less builder) must be gone from this pass.
    expect(out).toContain('FIRST use your Read tool to VIEW every screenshot');
    expect(out).not.toMatch(/do NOT call any tools/i);
  });

  it('renders single-shot render labels without slice joining', () => {
    const out = buildRevisePrompt(input, 'fixes', ['/d.png'], ['/m.png'], html);
    expect(out).toContain('desktop /d.png');
    expect(out).toContain('mobile /m.png');
    expect(out).not.toContain('slices top→bottom');
  });

  it('joins multiple slices with the top→bottom label', () => {
    const out = buildRevisePrompt(input, 'fixes', ['/d1.png', '/d2.png'], ['/m1.png', '/m2.png'], html);
    expect(out).toContain('desktop slices top→bottom: /d1.png , /d2.png');
    expect(out).toContain('mobile slices top→bottom: /m1.png , /m2.png');
  });

  it('uses the "(none)" placeholder when a viewport has no render', () => {
    const out = buildRevisePrompt(input, 'fixes', [], [], html);
    expect(out).toContain('desktop (none)');
    expect(out).toContain('mobile (none)');
  });
});

describe('surgical fix prompts carry only the output+safety subset, not the creative playbook', () => {
  const input = makeInput();
  const html = '<!doctype html><html><body>x</body></html>';

  it('buildLayoutFixPrompt omits the redesign directives that would license broad restyling', () => {
    const out = buildLayoutFixPrompt(input, '1. [major] spine crosses the heading', html);
    // Keeps the surgical framing + the safety rules a fix must honour.
    expect(out).toContain('Fix EXACTLY these defects and NOTHING else');
    expect(out).toContain('DECORATION SAFETY');
    expect(out).toContain('NO-JS-SAFE REVEAL');
    // Drops the creative playbook whose "redesign that section" / NEVER-list pressure fights "change nothing else".
    expect(out).not.toContain('STRUCTURE MANDATE');
    expect(out).not.toContain('NEVER (instant AI / dated tells)');
  });

  it('buildQaFixPrompt frames findings as runtime-health and permits the script/attr/asset edits they need', () => {
    const out = buildQaFixPrompt(input, '1. console error: undefined is not a function', html);
    expect(out).toContain('SURGICAL runtime-health fix');
    expect(out).toContain('1. console error: undefined is not a function');
    expect(out).toContain(html);
    // Explicitly permits the edits the layout fixer forbids…
    expect(out).toContain('these targeted changes are EXPECTED and permitted');
    // …while still forbidding a visual redesign and the creative playbook.
    expect(out).toContain('VISUALLY IDENTICAL');
    expect(out).not.toContain('STRUCTURE MANDATE');
  });
});

describe('real Google Maps facts in the prompt', () => {
  const maps = {
    rating: 4.7,
    reviewsCount: 213,
    reviews: [{ text: 'Best manicure in town, spotless studio.', stars: 5, name: 'Jenna' }],
    hours: ['Monday: 9 AM to 7 PM', 'Sunday: Closed'],
    categories: ['Nail salon', 'Spa'],
    priceLevel: '$$',
  };

  it('surfaces real rating, reviews and hours in the build prompt', () => {
    const out = buildBuildPrompt(makeInput({ mapsData: maps }), 'SPEC');
    expect(out).toContain('REAL GOOGLE MAPS FACTS');
    expect(out).toContain('4.7★ from 213 reviews');
    expect(out).toContain('Best manicure in town, spotless studio.');
    expect(out).toContain('Monday: 9 AM to 7 PM');
    // and the CONTENT directive tells the model to build from them
    expect(out).toContain('When REAL GOOGLE MAPS FACTS are given above, BUILD FROM THEM');
  });

  it('adds no facts block when mapsData is absent', () => {
    const out = buildBuildPrompt(makeInput({ mapsData: null }), 'SPEC');
    // The block header lines (not the CONTENT directive, which always references the facts by name).
    expect(out).not.toContain('Google rating:');
    expect(out).not.toContain('use these as the testimonials');
  });
});
