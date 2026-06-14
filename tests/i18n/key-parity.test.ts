import { describe, it, expect } from 'vitest';

import { en as enStatus, vi as viStatus } from '@/lib/i18n/keys/status';
import { en as enSystem, vi as viSystem } from '@/lib/i18n/keys/system';
import { en as enShellDash, vi as viShellDash } from '@/lib/i18n/keys/shell-dash';
import { en as enRoomsAgents, vi as viRoomsAgents } from '@/lib/i18n/keys/rooms-agents';
import { en as enPipelineAudit, vi as viPipelineAudit } from '@/lib/i18n/keys/pipeline-audit';
import { en as enLandingInfo, vi as viLandingInfo } from '@/lib/i18n/keys/landing-info';
import { en as enDemosDeals, vi as viDemosDeals } from '@/lib/i18n/keys/demos-deals';

// Each keys module ships an `en` and a `vi` map; the i18n provider merges them and looks up
// `t('ns.key')` at runtime. A missing key in either locale silently falls back to the raw key,
// so the invariant we protect here is: every module has an identical key set in both locales,
// and no value is blank.
const modules: Record<string, { en: Record<string, string>; vi: Record<string, string> }> = {
  status: { en: enStatus, vi: viStatus },
  system: { en: enSystem, vi: viSystem },
  'shell-dash': { en: enShellDash, vi: viShellDash },
  'rooms-agents': { en: enRoomsAgents, vi: viRoomsAgents },
  'pipeline-audit': { en: enPipelineAudit, vi: viPipelineAudit },
  'landing-info': { en: enLandingInfo, vi: viLandingInfo },
  'demos-deals': { en: enDemosDeals, vi: viDemosDeals },
};

describe('i18n key parity (en ↔ vi)', () => {
  for (const [name, { en, vi }] of Object.entries(modules)) {
    it(`"${name}" has identical key sets in en and vi`, () => {
      const enKeys = Object.keys(en).sort();
      const viKeys = Object.keys(vi).sort();
      const missingInVi = enKeys.filter((k) => !(k in vi));
      const missingInEn = viKeys.filter((k) => !(k in en));
      expect(missingInVi, `keys present in en but missing in vi (${name})`).toEqual([]);
      expect(missingInEn, `keys present in vi but missing in en (${name})`).toEqual([]);
    });

    it(`"${name}" has no blank values`, () => {
      const blankEn = Object.entries(en).filter(([, v]) => v.trim() === '').map(([k]) => k);
      const blankVi = Object.entries(vi).filter(([, v]) => v.trim() === '').map(([k]) => k);
      expect(blankEn, `blank en values (${name})`).toEqual([]);
      expect(blankVi, `blank vi values (${name})`).toEqual([]);
    });
  }

  it('keys are globally unique across modules (no cross-module collisions)', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const [name, { en }] of Object.entries(modules)) {
      for (const key of Object.keys(en)) {
        const prev = seen.get(key);
        if (prev) collisions.push(`${key} (in ${prev} and ${name})`);
        else seen.set(key, name);
      }
    }
    expect(collisions, 'duplicate keys across modules').toEqual([]);
  });
});
