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
  it('returns null for deterministic / non-renderable agents and unknown ids', () => {
    expect(agentPromptPreview('ledger')).toBeNull();
    expect(agentPromptPreview('orion')).toBeNull();
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
