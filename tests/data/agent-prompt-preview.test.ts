import { describe, it, expect } from 'vitest';
import { agentPromptPreview } from '@/lib/data/agent-prompt-preview';
import { AGENT_BRIEFS } from '@/lib/data/agent-briefs';

describe('agentPromptPreview', () => {
  it('renders the real prompt for the demo-gen agents against the sample job', () => {
    for (const id of ['vega', 'atlas', 'nova']) {
      const p = agentPromptPreview(id);
      expect(p).toBeTruthy();
      expect(p).toContain('Highlands Coffee'); // the sample client flows into the real builder
    }
  });
  it('vega/atlas/nova render distinct prompts (different builders)', () => {
    const set = new Set(['vega', 'atlas', 'nova'].map((id) => agentPromptPreview(id)));
    expect(set.size).toBe(3);
  });
  it('renders the verbatim prompt for the ops + review-board agents too', () => {
    for (const id of ['orion', 'echo', 'closer', 'cipher', 'mira', 'iris', 'kira']) {
      const p = agentPromptPreview(id);
      expect(p, id).toBeTruthy();
      expect(p, id).toContain('Highlands Coffee'); // the sample job flows into every real builder
    }
  });
  it('the review-board previews carry the shared finding contract (confidence gate + verdict)', () => {
    for (const id of ['iris', 'kira']) {
      const p = agentPromptPreview(id)!;
      expect(p).toContain('CONFIDENCE GATE');
      expect(p).toContain('VERDICT: PASS');
    }
  });
  it('returns null only for deterministic agents (ledger) and unknown ids', () => {
    expect(agentPromptPreview('ledger')).toBeNull();
    expect(agentPromptPreview('nope')).toBeNull();
  });
});

describe('AGENT_BRIEFS', () => {
  it('covers all 11 roster agents with EN + VI + a source pointer', () => {
    const ids = ['orion', 'vega', 'atlas', 'nova', 'iris', 'kira', 'cipher', 'echo', 'closer', 'mira', 'ledger'];
    for (const id of ids) {
      const b = AGENT_BRIEFS[id];
      expect(b, id).toBeTruthy();
      expect(b.en.length).toBeGreaterThan(20);
      expect(b.vi.length).toBeGreaterThan(20);
      expect(b.source.length).toBeGreaterThan(0);
    }
    expect(Object.keys(AGENT_BRIEFS)).toHaveLength(11);
  });
});
