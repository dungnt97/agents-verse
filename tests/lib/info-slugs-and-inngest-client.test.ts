import { describe, it, expect } from 'vitest';

import { INFO_PAGES } from '@/lib/info-slugs';
import type { InfoSlug } from '@/lib/info-slugs';
import { inngest } from '@/lib/inngest/client';
import type {
  AuditRequestedData,
  DemoRequestedData,
  PipelineFactData,
  PipelineFactName,
  PipelineControlData,
  PipelineControlName,
  ReplyReceivedData,
  OutreachRequestedData,
  OutreachApprovedData,
  OutreachSentData,
  DealWonData,
  DeliveryCompletedData,
  SupportApprovedData,
} from '@/lib/inngest/client';

// ---------------------------------------------------------------------------
// lib/info-slugs.ts — the canonical info-page slug list shared by the marketing
// server component (generateStaticParams / notFound) and the client InfoPage.
// ---------------------------------------------------------------------------
describe('INFO_PAGES', () => {
  // The exact, ordered roster every marketing info route validates against.
  const EXPECTED = [
    'about',
    'careers',
    'contact',
    'cases',
    'guarantees',
    'status',
    'privacy',
    'terms',
    'security',
  ];

  it('lists exactly the nine canonical slugs in declaration order', () => {
    expect(Array.from(INFO_PAGES)).toEqual(EXPECTED);
    expect(INFO_PAGES).toHaveLength(EXPECTED.length);
  });

  it('contains every expected slug', () => {
    for (const slug of EXPECTED) {
      expect(INFO_PAGES).toContain(slug);
    }
  });

  it('holds only non-empty, lowercase-kebab string entries', () => {
    for (const slug of INFO_PAGES) {
      expect(typeof slug).toBe('string');
      expect(slug.length).toBeGreaterThan(0);
      expect(slug).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it('has no duplicate slugs', () => {
    expect(new Set(INFO_PAGES).size).toBe(INFO_PAGES.length);
  });

  it('exposes InfoSlug as the union of its members (type-level contract)', () => {
    // Each literal is assignable to InfoSlug, and a slug drawn from the array
    // narrows to InfoSlug — exercising the `(typeof INFO_PAGES)[number]` export.
    const about: InfoSlug = 'about';
    const security: InfoSlug = 'security';
    const fromList: InfoSlug = INFO_PAGES[0];
    expect(about).toBe('about');
    expect(security).toBe('security');
    expect(INFO_PAGES).toContain(fromList);
  });
});

// ---------------------------------------------------------------------------
// lib/inngest/client.ts — the shared Inngest client + the event payload/name
// contracts. Only `inngest` is a runtime value; the rest are compile-time types.
// ---------------------------------------------------------------------------
describe('inngest client', () => {
  it('creates a single Inngest instance configured with the app id', () => {
    expect(inngest).toBeTruthy();
    expect(typeof inngest).toBe('object');
    expect(inngest.constructor.name).toBe('Inngest');
    expect((inngest as { id: string }).id).toBe('agents-verse');
  });

  it('exposes the send + createFunction surface used by web and worker', () => {
    expect(typeof inngest.send).toBe('function');
    expect(typeof (inngest as { createFunction: unknown }).createFunction).toBe('function');
  });
});

describe('inngest event-name unions (type contracts referenced via consts)', () => {
  it('pins the pipeline fact event names', () => {
    // Referencing the union through a typed const both documents the contract and
    // forces the exported type to stay in sync with these literal values.
    const facts: PipelineFactName[] = ['audit/completed', 'demo/completed', 'outreach/sent'];
    expect(facts).toEqual(['audit/completed', 'demo/completed', 'outreach/sent']);
  });

  it('pins the founder pipeline-control event names', () => {
    const controls: PipelineControlName[] = ['pipeline/resumed', 'pipeline/halted'];
    expect(controls).toEqual(['pipeline/resumed', 'pipeline/halted']);
  });
});

describe('inngest event payload contracts (shape sanity via typed literals)', () => {
  it('builds each documented event payload with its required + optional fields', () => {
    const auditRequested: AuditRequestedData = { leadId: 'lead-1', runId: 'run-1' };
    const demoRequested: DemoRequestedData = { leadId: 'lead-1' };
    const fact: PipelineFactData = { runId: 'run-1', leadId: 'lead-1', outcome: 'ok' };
    const factFailed: PipelineFactData = { runId: 'run-1', leadId: 'lead-1', outcome: 'failed' };
    const control: PipelineControlData = { runId: 'run-1' };
    const reply: ReplyReceivedData = { dealId: 'deal-1', text: 'sounds good' };
    const outreachReq: OutreachRequestedData = { leadId: 'lead-1' };
    const outreachApproved: OutreachApprovedData = {
      leadId: 'lead-1',
      subject: 'Hi',
      body: 'Body',
      runId: 'run-1',
    };
    const outreachSent: OutreachSentData = { leadId: 'lead-1', outcome: 'failed' };
    const dealWon: DealWonData = { dealId: 'deal-1', leadId: 'lead-1' };
    const delivery: DeliveryCompletedData = { leadId: 'lead-1', dealId: 'deal-1' };
    const support: SupportApprovedData = { leadId: 'lead-1', subject: 'Assets', body: 'Body' };

    expect(auditRequested.runId).toBe('run-1');
    expect(demoRequested.runId).toBeUndefined();
    expect(fact.outcome).toBe('ok');
    expect(factFailed.outcome).toBe('failed');
    expect(control.runId).toBe('run-1');
    expect(reply.text).toBe('sounds good');
    expect(reply.leadId).toBeUndefined();
    expect(outreachReq.runId).toBeUndefined();
    expect(outreachApproved.subject).toBe('Hi');
    expect(outreachSent.outcome).toBe('failed');
    expect(dealWon.dealId).toBe('deal-1');
    expect(delivery.leadId).toBe('lead-1');
    expect(support.body).toBe('Body');
  });
});
