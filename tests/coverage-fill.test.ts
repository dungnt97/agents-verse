import { describe, it, expect } from 'vitest';
import { cipherCoder } from '@/lib/agents/defs/cipher-coder';
import { echoOutreach } from '@/lib/agents/defs/echo-outreach';
import { miraSupport } from '@/lib/agents/defs/mira-support';
import { closerSales } from '@/lib/agents/defs/closer-sales';
import * as landing from '@/lib/i18n/keys/landing-info';
import * as pipeline from '@/lib/i18n/keys/pipeline-audit';
import * as system from '@/lib/i18n/keys/system';
import * as shellDash from '@/lib/i18n/keys/shell-dash';

// --- Agent def buildPrompt coverage (the validate-only tests don't exercise buildPrompt) ---
describe('agent def buildPrompt builders', () => {
  it('cipherCoder builds an SEO-metadata prompt embedding the brand', () => {
    const p = cipherCoder.buildPrompt({ company: 'Atlas Dental', industry: 'dentistry', city: 'Houston', summary: 'faster mobile site' });
    expect(p).toContain('Atlas Dental');
    expect(p).toContain('dentistry');
    expect(p).toContain('Houston');
    expect(p).toMatch(/STRICT JSON/i);
  });
  it('echoOutreach builds a VN outreach email prompt with the CTA', () => {
    const p = echoOutreach.buildPrompt({ company: 'Lumi Spa', industry: 'wellness', city: 'Da Nang', cta: 'đặt lịch', summary: 'redesign' });
    expect(p).toContain('Lumi Spa');
    expect(p).toContain('Da Nang');
    expect(p).toContain('đặt lịch');
    expect(p).toMatch(/STRICT JSON/i);
  });
  it('miraSupport builds an onboarding prompt for the client + package', () => {
    const p = miraSupport.buildPrompt({ client: 'UrbanFit', industry: 'fitness', city: 'Bangkok', pkg: 'Business Website' });
    expect(p).toContain('UrbanFit');
    expect(p).toContain('Business Website');
    expect(p).toMatch(/STRICT JSON/i);
  });
  it('closerSales builds a reply-interpretation prompt fenced with the legal next stages + reply text', () => {
    const p = closerSales.buildPrompt({
      deal: { client: 'Nova Realty', industry: 'real estate', city: 'Miami', pkg: 'Premium', value: 6400, stage: 'quoted' },
      legalNextStages: ['won', 'approval', 'lost'],
      text: 'We want to proceed but need a call first.',
    });
    expect(p).toContain('Nova Realty');
    expect(p).toContain('quoted');
    expect(p).toContain('We want to proceed');
    expect(p).toContain('won');
  });
});

// --- i18n parity for the remaining key modules (en/vi must have identical key sets, no empties) ---
describe('i18n key parity (all modules)', () => {
  for (const [name, mod] of Object.entries({ landing, pipeline, system, shellDash })) {
    it(`${name}: en and vi share the same keys with no empty values`, () => {
      const en = (mod as Record<string, Record<string, string>>).en;
      const vi = (mod as Record<string, Record<string, string>>).vi;
      expect(en).toBeTruthy();
      expect(vi).toBeTruthy();
      expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
      for (const k of Object.keys(en)) {
        expect(en[k]).toBeTruthy();
        expect(vi[k]).toBeTruthy();
      }
    });
  }
});
