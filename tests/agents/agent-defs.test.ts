import { describe, it, expect } from 'vitest';

import type { DemoGenInput } from '@/lib/demo-gen/prompt';
import { DESKTOP_WIDTH, MOBILE_WIDTH } from '@/lib/demo-gen/render';

import {
  atlasConceptor,
  atlasDirector,
  atlasSynthesizer,
  type DirectorInput,
  type SynthesisInput,
} from '@/lib/agents/defs/atlas-strategist';
import {
  novaBuilder,
  novaReviser,
  type BuildInput,
  type ReviseInput,
} from '@/lib/agents/defs/nova-designer';
import { vegaResearcher, type ResearchInput } from '@/lib/agents/defs/vega-researcher';
import {
  personaByKey,
  reviewDef,
  type ReviewInput,
} from '@/lib/agents/defs/review-persona';
import { irisReview } from '@/lib/agents/defs/iris-ux';
import { kiraReview } from '@/lib/agents/defs/kira-qa';
import { echoOutreach } from '@/lib/agents/defs/echo-outreach';
import { closerSales } from '@/lib/agents/defs/closer-sales';
import { cipherCoder } from '@/lib/agents/defs/cipher-coder';
import { miraSupport } from '@/lib/agents/defs/mira-support';
import { REVIEW_BOARD } from '@/lib/agents/board';
import { AGENTS, getAgent } from '@/lib/agents/registry';

// A minimal but complete DemoGenInput the prompt builders interpolate into their output. The unusual
// proper-noun values (company/industry/city/url) act as fingerprints we assert are echoed back.
const input: DemoGenInput = {
  company: 'Zenith Realty',
  industry: 'real estate',
  city: 'Da Nang',
  url: 'https://zenith.example/old',
  language: 'English',
  scores: {
    visual: 40,
    mobile: 30,
    cta: 55,
    trust: 20,
    seo: 65,
    speed: 70,
    content: 35,
    conversion: 25,
  },
  problems: ['No mobile layout', 'Weak hero'],
  redesign: {
    style: 'editorial',
    sections: ['hero', 'listings', 'contact'],
    cta: 'Đặt lịch xem nhà',
    content: 'confident, local',
    template: 'property',
  },
  summary: 'A dated property site with a weak hero and no mobile layout.',
};

// A complete-enough HTML document to pass the html validator (needs <html>, </html>, >= 500 chars).
const validHtml = `<!doctype html><html lang="vi"><head><title>x</title></head><body>${'x'.repeat(600)}</body></html>`;

describe('atlas-strategist defs', () => {
  it('atlasConceptor has the expected identity, model, tools and limits', () => {
    expect(atlasConceptor.id).toBe('atlas');
    expect(atlasConceptor.model).toBe('opus');
    expect(atlasConceptor.tools).toEqual([]);
    expect(atlasConceptor.limits).toEqual({ timeoutMs: 180_000, maxTurns: 1 });
    expect(atlasConceptor.role).toContain('Creative Director');
  });

  it('atlasConceptor.buildPrompt interpolates the client + research + style provocation', () => {
    const dirInput: DirectorInput = {
      input,
      researchBrief: 'BRIEF-MARKER real brand notes',
      styleProvocation: 'PROVOCATION-MARKER brutalist lane',
    };
    const p = atlasConceptor.buildPrompt(dirInput);
    expect(typeof p).toBe('string');
    expect(p).toContain('THREE');
    expect(p).toContain('<<<WINNER>>>');
    expect(p).toContain(input.company);
    expect(p).toContain('BRIEF-MARKER');
    expect(p).toContain('PROVOCATION-MARKER');
    expect(p).toContain('SIGNATURE MOVE');
  });

  it('atlasConceptor.buildPrompt works without a style provocation', () => {
    const p = atlasConceptor.buildPrompt({ input, researchBrief: 'brief only' });
    expect(p).toContain('<<<WINNER>>>');
    expect(p).not.toContain('AESTHETIC PROVOCATION');
  });

  it('atlasConceptor.validate trims raw output', () => {
    expect(atlasConceptor.validate('  hello concept  ')).toBe('hello concept');
  });

  it('atlasDirector has the expected identity and emits a director spec', () => {
    expect(atlasDirector.id).toBe('atlas');
    expect(atlasDirector.model).toBe('opus');
    expect(atlasDirector.tools).toEqual([]);
    expect(atlasDirector.limits).toEqual({ timeoutMs: 180_000, maxTurns: 1 });
    expect(atlasDirector.role).toContain('Brand Strategist');

    const withConcept = atlasDirector.buildPrompt({
      input,
      researchBrief: 'BRIEF-X',
      concept: 'CONCEPT-X signature scroll',
    });
    expect(withConcept).toContain('COMMIT TO ONE BOLD ART DIRECTION');
    // the concept block is only emitted when a concept is supplied
    expect(withConcept).toContain('=== CHOSEN CONCEPT');
    expect(withConcept).toContain('CONCEPT-X');
    expect(withConcept).toContain('BRIEF-X');
    expect(withConcept).toContain(input.city);
  });

  it('atlasDirector.buildPrompt omits the concept block when no concept is given', () => {
    const noConcept = atlasDirector.buildPrompt({ input, researchBrief: '' });
    expect(noConcept).toContain('COMMIT TO ONE BOLD ART DIRECTION');
    // the EXECUTE-THIS concept delimiter block is absent without a concept
    expect(noConcept).not.toContain('=== CHOSEN CONCEPT');
  });

  it('atlasDirector.validate trims', () => {
    expect(atlasDirector.validate('\n spec \n')).toBe('spec');
  });

  it('atlasSynthesizer consolidates reviews into a fix list', () => {
    expect(atlasSynthesizer.id).toBe('atlas');
    expect(atlasSynthesizer.model).toBe('opus');
    expect(atlasSynthesizer.tools).toEqual([]);
    expect(atlasSynthesizer.limits).toEqual({ timeoutMs: 180_000, maxTurns: 1 });
    expect(atlasSynthesizer.role).toContain('Design Director');

    const synInput: SynthesisInput = { input, reviews: ['REVIEW-A first', 'REVIEW-B second'] };
    const p = atlasSynthesizer.buildPrompt(synInput);
    expect(p).toContain('prioritized fix list');
    expect(p).toContain('REVIEW-A');
    expect(p).toContain('REVIEW-B');
    expect(p).toContain('=== REVIEW 1 ===');
    expect(p).toContain('=== REVIEW 2 ===');
    expect(p).toContain(input.company);
  });

  it('atlasSynthesizer.validate trims', () => {
    expect(atlasSynthesizer.validate('  fixes  ')).toBe('fixes');
  });
});

describe('nova-designer defs', () => {
  it('novaBuilder has the expected identity, model, tools and limits', () => {
    expect(novaBuilder.id).toBe('nova');
    expect(novaBuilder.model).toBe('opus');
    expect(novaBuilder.tools).toEqual([]);
    expect(novaBuilder.limits).toEqual({ timeoutMs: 900_000, maxTurns: 4 });
    expect(novaBuilder.role).toContain('UI Designer');
  });

  it('novaBuilder.buildPrompt embeds the spec and the craft constraints', () => {
    const buildInput: BuildInput = { input, spec: 'SPEC-MARKER design direction' };
    const p = novaBuilder.buildPrompt(buildInput);
    expect(p).toContain('=== DESIGN SPEC ===');
    expect(p).toContain('SPEC-MARKER');
    expect(p).toContain('world-class front-end engineer');
    // craftConstraints fingerprint + interpolated CTA
    expect(p).toContain('ONE complete self-contained HTML5 document');
    expect(p).toContain(input.redesign.cta);
    expect(p).toContain(input.company);
  });

  it('novaBuilder.validate accepts a complete HTML document and throws on junk', () => {
    expect(novaBuilder.validate(validHtml)).toContain('<html');
    // fenced HTML is tolerated
    expect(novaBuilder.validate('```html\n' + validHtml + '\n```')).toContain('</html>');
    expect(() => novaBuilder.validate('not html')).toThrow(/complete HTML document/);
    expect(() => novaBuilder.validate('<html></html>')).toThrow(/complete HTML document/);
  });

  it('novaReviser revises against the fix list and needs Read', () => {
    expect(novaReviser.id).toBe('nova');
    expect(novaReviser.model).toBe('opus');
    expect(novaReviser.tools).toEqual(['Read']);
    expect(novaReviser.limits).toEqual({ timeoutMs: 600_000, maxTurns: 10 });
    expect(novaReviser.role).toContain('revise');

    const reviseInput: ReviseInput = {
      input,
      fixes: 'FIXES-MARKER 1) bolder hero',
      desktopPngs: ['/d0.png', '/d1.png'],
      mobilePngs: ['/m0.png'],
      currentHtml: '<html>CURRENT-MARKER</html>',
    };
    const p = novaReviser.buildPrompt(reviseInput);
    expect(p).toContain('FIXES-MARKER');
    expect(p).toContain('CURRENT-MARKER');
    expect(p).toContain('=== CURRENT HTML (revise this) ===');
    expect(p).toContain('REGRESSION GUARD');
    // multi-slice desktop join + single-shot mobile
    expect(p).toContain('/d0.png');
    expect(p).toContain('/d1.png');
    expect(p).toContain('/m0.png');
  });

  it('novaReviser.validate also enforces complete HTML', () => {
    expect(novaReviser.validate(validHtml)).toContain('<html');
    expect(() => novaReviser.validate('   ')).toThrow(/complete HTML document/);
  });
});

describe('vega-researcher def', () => {
  it('has the expected identity, model, tools and limits', () => {
    expect(vegaResearcher.id).toBe('vega');
    expect(vegaResearcher.model).toBe('opus');
    expect(vegaResearcher.tools).toEqual(['Read']);
    expect(vegaResearcher.limits).toEqual({ timeoutMs: 360_000, maxTurns: 8 });
    expect(vegaResearcher.role).toContain('Website Critic');
  });

  it('buildPrompt lists the old-site screenshots and the two output blocks', () => {
    const r: ResearchInput = { input, oldSitePngs: ['/old0.png', '/old1.png'] };
    const p = vegaResearcher.buildPrompt(r);
    expect(p).toContain('research brief');
    expect(p).toContain('CLIENT REALITY');
    expect(p).toContain('REFERENCE BAR');
    expect(p).toContain('/old0.png');
    expect(p).toContain('/old1.png');
    expect(p).toContain(input.company);
    expect(p).toContain(input.industry);
  });

  it('buildPrompt degrades gracefully when no screenshots are available', () => {
    const p = vegaResearcher.buildPrompt({ input, oldSitePngs: [] });
    expect(p).toContain('current-site screenshot unavailable');
  });

  it('validate trims raw output', () => {
    expect(vegaResearcher.validate('  brief  ')).toBe('brief');
  });
});

describe('review-persona factory', () => {
  it('personaByKey returns the matching persona for known keys', () => {
    for (const key of ['uiux', 'copy', 'niche', 'art']) {
      expect(personaByKey(key).key).toBe(key);
    }
  });

  it('personaByKey throws on an unknown key', () => {
    expect(() => personaByKey('nope')).toThrow(/unknown review persona: nope/);
  });

  it('reviewDef builds a well-formed review AgentDef', () => {
    const def = reviewDef('iris', 'My Reviewer role', personaByKey('uiux'));
    expect(def.id).toBe('iris');
    expect(def.role).toBe('My Reviewer role');
    expect(def.model).toBe('opus');
    expect(def.tools).toEqual(['Read']);
    expect(def.limits).toEqual({ timeoutMs: 420_000, maxTurns: 8 });
  });

  it('reviewDef.buildPrompt renders both viewports at the exported widths + persona brief', () => {
    const def = reviewDef('niche', 'Domain Expert', personaByKey('niche'));
    const ri: ReviewInput = {
      input,
      desktopPngs: ['/d0.png', '/d1.png'],
      mobilePngs: ['/m0.png'],
    };
    const p = def.buildPrompt(ri);
    expect(p).toContain('Desktop (' + DESKTOP_WIDTH + 'px)');
    expect(p).toContain('Mobile (' + MOBILE_WIDTH + 'px)');
    expect(p).toContain('/d0.png');
    expect(p).toContain('/m0.png');
    // niche persona brief fingerprint (industry upper-cased)
    expect(p).toContain(input.industry.toUpperCase());
    // expected-sections coverage line
    expect(p).toContain(input.redesign.sections.join(', '));
  });

  it('reviewDef.validate requires non-empty text', () => {
    const def = reviewDef('copy', 'Copywriter', personaByKey('copy'));
    expect(def.validate('  some review  ')).toBe('some review');
    expect(() => def.validate('   ')).toThrow(/empty text/);
  });
});

describe('iris-ux + kira-qa board members', () => {
  it('irisReview wraps the uiux persona with the iris identity', () => {
    expect(irisReview.id).toBe('iris');
    expect(irisReview.model).toBe('opus');
    expect(irisReview.tools).toEqual(['Read']);
    expect(irisReview.role).toContain('UX Reviewer');
    const p = irisReview.buildPrompt({ input, desktopPngs: ['/d.png'], mobilePngs: ['/m.png'] });
    expect(p).toContain('SENIOR UI/UX DESIGNER');
  });

  it('kiraReview wraps the art persona with the kira identity', () => {
    expect(kiraReview.id).toBe('kira');
    expect(kiraReview.model).toBe('opus');
    expect(kiraReview.tools).toEqual(['Read']);
    expect(kiraReview.role).toContain('Visual QA');
    const p = kiraReview.buildPrompt({ input, desktopPngs: ['/d.png'], mobilePngs: ['/m.png'] });
    expect(p).toContain('ART DIRECTOR');
  });
});

describe('REVIEW_BOARD', () => {
  it('contains the four lenses in the fixed uiux → copy → niche → art order', () => {
    expect(REVIEW_BOARD).toHaveLength(4);
    expect(REVIEW_BOARD.map((d) => d.id)).toEqual(['iris', 'copy', 'niche', 'kira']);
    expect(REVIEW_BOARD[0]).toBe(irisReview);
    expect(REVIEW_BOARD[3]).toBe(kiraReview);
    // every member is opus + Read-only
    for (const member of REVIEW_BOARD) {
      expect(member.model).toBe('opus');
      expect(member.tools).toEqual(['Read']);
    }
  });

  it('the copy + niche board sub-lenses use the matching personas', () => {
    const copy = REVIEW_BOARD[1];
    const niche = REVIEW_BOARD[2];
    expect(copy.role).toContain('Copywriter');
    expect(niche.role).toContain('Domain Expert');
    const ctx = { input, desktopPngs: ['/d.png'], mobilePngs: ['/m.png'] };
    expect(copy.buildPrompt(ctx)).toContain('CONVERSION COPYWRITER');
    expect(niche.buildPrompt(ctx)).toContain('DOMAIN EXPERT');
  });
});

describe('AGENTS registry', () => {
  it('maps each dashboard agent to its primary def, keyed by AgentId', () => {
    expect(Object.keys(AGENTS).sort()).toEqual(['atlas', 'cipher', 'closer', 'echo', 'iris', 'kira', 'mira', 'nova', 'vega']);
    expect(AGENTS.atlas).toBe(atlasDirector);
    expect(AGENTS.nova).toBe(novaBuilder);
    expect(AGENTS.iris).toBe(irisReview);
    expect(AGENTS.kira).toBe(kiraReview);
    expect(AGENTS.vega).toBe(vegaResearcher);
    expect(AGENTS.echo).toBe(echoOutreach);
    expect(AGENTS.closer).toBe(closerSales);
    expect(AGENTS.cipher).toBe(cipherCoder);
    expect(AGENTS.mira).toBe(miraSupport);
  });

  it('every registered def carries the AgentId it is keyed under', () => {
    for (const [id, def] of Object.entries(AGENTS)) {
      expect(def.id, id).toBe(id);
    }
  });

  it('getAgent resolves each registered id to its def', () => {
    for (const id of Object.keys(AGENTS) as (keyof typeof AGENTS)[]) {
      expect(getAgent(id)).toBe(AGENTS[id]);
    }
  });
});
