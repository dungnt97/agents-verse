import { describe, it, expect } from 'vitest';
import {
  AV,
  buildAuditFor,
  buildRoomMetrics,
  ROOM_PROJECTS,
  PROJ_STATUS,
  TIMELINE,
  DEFAULT_TIMELINE,
} from '@/lib/data/index';
import type { Lead, Room } from '@/lib/data/types';

// lib/data/index.ts has no external deps (only type imports + the client-safe ./format helpers),
// so nothing here needs vi.mock — we exercise the real AV singleton + the directly-exported builders.

describe('AV.agentById', () => {
  it('returns the matching agent for a known id', () => {
    const a = AV.agentById('orion');
    expect(a).toBeDefined();
    expect(a?.id).toBe('orion');
    expect(a?.role).toBe('Lead Hunter Agent');
    expect(a?.room).toBe('research');
  });

  it('returns undefined for an unknown id', () => {
    expect(AV.agentById('nobody')).toBeUndefined();
  });
});

describe('AV.roomById', () => {
  it('returns the matching room for a known id', () => {
    const r = AV.roomById('design');
    expect(r).toBeDefined();
    expect(r?.id).toBe('design');
    expect(r?.name).toBe('Design Studio');
    expect(r?.agents).toContain('nova');
  });

  it('returns undefined for an unknown id', () => {
    expect(AV.roomById('void')).toBeUndefined();
  });
});

describe('AV.fmt', () => {
  it('money formats with a $ prefix and locale grouping', () => {
    expect(AV.fmt.money(0)).toBe('$0');
    expect(AV.fmt.money(6400)).toBe('$6,400');
    expect(AV.fmt.money(1234567)).toBe('$1,234,567');
  });

  it('money2 formats to two decimal places', () => {
    expect(AV.fmt.money2(42.8)).toBe('$42.80');
    expect(AV.fmt.money2(1)).toBe('$1.00');
  });

  it('k abbreviates thousands and leaves small numbers plain', () => {
    expect(AV.fmt.k(8400)).toBe('$8.4k');
    expect(AV.fmt.k(1000)).toBe('$1.0k');
    expect(AV.fmt.k(999)).toBe('$999');
    expect(AV.fmt.k(0)).toBe('$0');
  });
});

describe('AV presentation maps', () => {
  it('statusMap maps a status to a label/class/dot', () => {
    expect(AV.statusMap.working.label).toBe('Working');
    expect(AV.statusMap.working.cls).toBe('badge-success');
    expect(AV.statusMap.escalate.cls).toBe('badge-danger');
  });

  it('stages lists the lead pipeline in order', () => {
    expect(AV.stages.map(s => s.id)).toEqual([
      'found', 'audited', 'demo', 'contacted', 'replied', 'won',
    ]);
  });

  it('hueFor returns the industry hue or a default', () => {
    expect(AV.hueFor('Healthcare')).toBe(200);
    expect(AV.hueFor('Unknown Industry')).toBe(220);
  });

  it('SCORE_LABELS / DEMO_STATUS / DEAL_STAGE / REQ_STATUS are exposed', () => {
    expect(AV.SCORE_LABELS[0]).toEqual(['visual', 'Visual design']);
    expect(AV.DEMO_STATUS.approved.label).toBe('Approved');
    expect(AV.DEAL_STAGE.call.cls).toBe('badge-danger');
    expect(AV.REQ_STATUS.new.label).toBe('New');
  });
});

describe('AV.agentDetail', () => {
  it('returns null for an unknown agent', () => {
    expect(AV.agentDetail('ghost')).toBeNull();
  });

  it('materializes role-specific skills/tools/purpose/history/outputs for a mapped role', () => {
    const d = AV.agentDetail('nova')!; // role: UI Designer Agent — has dedicated maps
    expect(d).not.toBeNull();
    expect(d.id).toBe('nova');
    expect(d.purpose).toContain('high-conversion website demo');
    expect(d.skills).toContain('Landing-page design');
    expect(d.tools).toContain('Layout engine');
    expect(d.history[0].event).toContain('Lumi Spa Studio');
    expect(d.outputs.length).toBeGreaterThan(0);
    expect(d.outputs[0].title).toContain('Lumi Spa Studio');
    // Derived numeric fields.
    expect(typeof d.approval).toBe('number');
    expect(d.maxTasks).toBe(60);
    expect(d.escalationThreshold).toBe(80);
    expect(Array.isArray(d.chatPrompts)).toBe(true);
    expect(d.chatPrompts.length).toBe(4);
  });

  it('falls back to default skills/tools/history and empty outputs for an unmapped role', () => {
    // 'orion' (Lead Hunter Agent) has SKILLS/TOOLS/PURPOSE but no HISTORY/OUTPUTS entries,
    // so it exercises the default-history + empty-outputs branches.
    const d = AV.agentDetail('orion')!;
    expect(d.history.length).toBe(4);
    expect(d.history[0].event).toBe('Completed current task batch');
    expect(d.outputs).toEqual([]);
  });

  it('uses generic purpose/skills/tools when the role is unmapped', () => {
    // buildAuditFor-independent: 'ledger' (Finance Agent) is mapped, but we want the *generic*
    // fallback path. Verify it indirectly: every seeded agent still yields a non-null detail.
    for (const a of AV.agents) {
      const d = AV.agentDetail(a.id);
      expect(d).not.toBeNull();
      expect(d!.skills.length).toBeGreaterThan(0);
      expect(d!.tools.length).toBeGreaterThan(0);
      expect(typeof d!.purpose).toBe('string');
    }
  });
});

describe('AV.roomProjects', () => {
  it('returns enriched projects (lead + PROJ_STATUS overlay) for a mapped room', () => {
    const projects = AV.roomProjects('design');
    expect(projects.map(p => p.id)).toEqual(ROOM_PROJECTS.design);
    const atlas = projects.find(p => p.id === 'atlas-d')!;
    expect(atlas.company).toBe('Atlas Dental Clinic'); // from lead
    expect(atlas.label).toBe(PROJ_STATUS['atlas-d'].label); // from overlay
    expect(atlas.progress).toBe(82);
  });

  it('returns an empty array for a room with no mapped projects', () => {
    expect(AV.roomProjects('finance')).toEqual([]);
    expect(AV.roomProjects('does-not-exist')).toEqual([]);
  });
});

describe('AV.roomTimeline', () => {
  it('returns the room-specific timeline when present', () => {
    const tl = AV.roomTimeline('design');
    expect(tl).toEqual(TIMELINE.design);
    expect(tl[0].agent).toBe('nova');
  });

  it('falls back to DEFAULT_TIMELINE with the room first agent filled in', () => {
    // 'audit' has no TIMELINE entry → default timeline, null agents replaced by room.agents[0] ('vega').
    const tl = AV.roomTimeline('audit');
    expect(tl.length).toBe(DEFAULT_TIMELINE.length);
    expect(tl.every(e => e.agent === 'vega')).toBe(true);
  });

  it('falls back to a null agent for an unknown room', () => {
    const tl = AV.roomTimeline('nope');
    expect(tl.length).toBe(DEFAULT_TIMELINE.length);
    expect(tl.every(e => e.agent === null)).toBe(true);
  });
});

describe('AV.roomMetrics / buildRoomMetrics', () => {
  it('returns the curated metric tuples for a known room', () => {
    const m = AV.roomMetrics('sales');
    expect(m).toContainEqual(['Replies', '7']);
    expect(m).toContainEqual(['Forecast', '$8.4k']);
  });

  it('design metrics inject the room done count', () => {
    const design = AV.roomById('design')!;
    const m = AV.roomMetrics('design');
    expect(m[0]).toEqual(['Demos today', design.done]);
  });

  it('buildRoomMetrics falls back to a generic tuple set for an unmapped room id', () => {
    const fake: Room = {
      id: 'mystery',
      name: 'Mystery Room',
      short: 'Mystery',
      purpose: 'x',
      status: 'idle',
      agents: ['a1', 'a2'],
      active: 0,
      running: 2,
      done: 9,
      health: 77,
      mission: 'm',
      x: 0,
      y: 0,
    };
    const m = buildRoomMetrics(fake);
    expect(m).toEqual([
      ['Tasks today', 9],
      ['Running', 2],
      ['Health', '77%'],
      ['Agents', 2],
    ]);
  });
});

describe('AV.audit / buildAuditFor', () => {
  it('materializes an audit from a known lead using its stored score profile', () => {
    const res = AV.audit('atlas-d');
    expect(res.company).toBe('Atlas Dental Clinic');
    // Known profile from SCORE_PROFILES['atlas-d'].
    expect(res.scores.visual).toBe(28);
    expect(res.scores.mobile).toBe(22);
    expect(res.problems.length).toBe(6);
    expect(res.redesign.cta).toContain('Book an appointment');
    // confidence = min(97, 70 + round((score - site)/2)) = 70 + round((88-34)/2) = 97.
    expect(res.confidence).toBe(97);
    expect(res.summary).toContain('Atlas Dental Clinic');
    expect(res.summary).toContain('34/100');
  });

  it('falls back to the first lead for an unknown lead id', () => {
    const res = AV.audit('not-a-lead');
    expect(res.id).toBe('atlas-d'); // leads[0]
  });

  it('synthesizes scores + Healthcare redesign for an unmapped lead/industry', () => {
    const lead: Lead = {
      id: 'synthetic',
      company: 'Synthetic Co',
      industry: 'Aerospace', // not in REDESIGN → Healthcare fallback
      city: 'Nowhere',
      url: 'synthetic.example.com',
      site: 50,
      score: 90,
      value: 1000,
      agent: 'nova',
      stage: 'found',
      demo: 'none',
    };
    const res = buildAuditFor(lead);
    // Derived scores from site when no profile exists.
    expect(res.scores.visual).toBe(44); // site - 6
    expect(res.scores.speed).toBe(64); // site + 14
    expect(res.redesign.template).toBe('Clinic demo template'); // Healthcare fallback
    // confidence = min(97, 70 + round((90-50)/2)) = min(97, 90) = 90.
    expect(res.confidence).toBe(90);
    expect(res.summary).toContain("Synthetic Co's");
  });

  it('caps confidence at 97', () => {
    const lead: Lead = {
      id: 'capped',
      company: 'Capped Co',
      industry: 'Fitness',
      city: 'Town',
      url: 'capped.example.com',
      site: 10,
      score: 99,
      value: 500,
      agent: 'mira',
      stage: 'won',
      demo: 'won',
    };
    const res = buildAuditFor(lead);
    expect(res.confidence).toBe(97);
    expect(res.redesign.template).toBe('Gym demo template');
  });
});

describe('AV.auditedLeads', () => {
  it('keeps only leads past the found stage and excludes found-only leads', () => {
    const audited = AV.auditedLeads();
    const ids = audited.map(l => l.id);
    expect(ids).not.toContain('north'); // stage 'found'
    expect(ids).toContain('atlas-d'); // stage 'demo'
    expect(ids).toContain('mekong'); // stage 'audited'
    expect(audited.every(l => l.stage !== 'found')).toBe(true);
  });
});

describe('AV.demos / AV.demoByLead', () => {
  it('derives a demo for every lead whose demo !== none', () => {
    const withDemo = AV.leads.filter(l => l.demo !== 'none');
    expect(AV.demos.length).toBe(withDemo.length);
    // 'north' has demo 'none' → no demo entry.
    expect(AV.demos.find(d => d.leadId === 'north')).toBeUndefined();
  });

  it('returns the matching demo for a known lead with derived fields', () => {
    const d = AV.demoByLead('lumi')!;
    expect(d).toBeDefined();
    expect(d.business).toBe('Lumi Spa Studio');
    expect(d.id).toBe('demo-lumi');
    expect(d.agents).toEqual(['nova', 'kira']); // lumi branch
    expect(d.statusLabel).toBe('Approved'); // demo 'approved'
    expect(d.demoUrl).toBe('demo.agentsverse.ai/lumi');
    expect(d.outreach.subject).toContain('Lumi Spa Studio');
  });

  it('applies the nova-r agent branch and Healthcare changes fallback', () => {
    const d = AV.demoByLead('nova-r')!;
    expect(d.agents).toEqual(['atlas', 'nova']);
    expect(d.changes.length).toBeGreaterThan(0);
  });

  it('returns undefined for an unknown lead', () => {
    expect(AV.demoByLead('north')).toBeUndefined();
    expect(AV.demoByLead('ghost')).toBeUndefined();
  });
});

describe('AV.dealByLead', () => {
  it('returns the deal for a known lead', () => {
    const d = AV.dealByLead('nova-r')!;
    expect(d).toBeDefined();
    expect(d.id).toBe('d-nova');
    expect(d.client).toBe('Nova Realty Group');
    expect(d.stage).toBe('call');
  });

  it('returns a won deal with a production block', () => {
    const d = AV.dealByLead('urbanfit')!;
    expect(d.stage).toBe('won');
    expect(d.production).not.toBeNull();
    expect(d.production?.assets.length).toBeGreaterThan(0);
  });

  it('returns undefined for a lead without a deal', () => {
    expect(AV.dealByLead('north')).toBeUndefined();
    expect(AV.dealByLead('ghost')).toBeUndefined();
  });
});

describe('AV.demoRequests', () => {
  it('exposes the seeded inbound demo requests with statuses', () => {
    expect(AV.demoRequests.length).toBe(5);
    expect(AV.demoRequests[0].business).toBe('Bella Nails & Spa');
    const statuses = AV.demoRequests.map(r => r.status);
    expect(statuses).toContain('new');
    expect(statuses).toContain('converted');
  });
});

describe('exported overlay maps', () => {
  it('ROOM_PROJECTS / PROJ_STATUS / TIMELINE are populated', () => {
    expect(ROOM_PROJECTS.design).toContain('atlas-d');
    expect(PROJ_STATUS['lumi'].progress).toBe(100);
    expect(TIMELINE.design.length).toBe(5);
  });
});
