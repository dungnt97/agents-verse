import { describe, it, expect } from 'vitest';

// EN/VI parity for the i18n key modules: each module must export `en` and `vi`
// maps with the exact same set of keys (no missing, no extra) and no empty values.
import * as landingInfo from '@/lib/i18n/keys/landing-info';
import * as pipelineAudit from '@/lib/i18n/keys/pipeline-audit';
import * as system from '@/lib/i18n/keys/system';
import * as shellDash from '@/lib/i18n/keys/shell-dash';

type KeyModule = {
  en: Record<string, string>;
  vi: Record<string, string>;
};

const MODULES: ReadonlyArray<readonly [string, KeyModule]> = [
  ['landing-info', landingInfo],
  ['pipeline-audit', pipelineAudit],
  ['system', system],
  ['shell-dash', shellDash],
];

describe('i18n key modules — EN/VI parity', () => {
  describe.each(MODULES)('%s', (name, mod) => {
    it('exports both en and vi maps that are non-empty plain objects', () => {
      expect(mod.en, `${name}.en`).toBeTypeOf('object');
      expect(mod.vi, `${name}.vi`).toBeTypeOf('object');
      expect(mod.en).not.toBeNull();
      expect(mod.vi).not.toBeNull();
      expect(Object.keys(mod.en).length, `${name}.en should have keys`).toBeGreaterThan(0);
      expect(Object.keys(mod.vi).length, `${name}.vi should have keys`).toBeGreaterThan(0);
    });

    it('en and vi have the EXACT same set of keys (no missing/extra)', () => {
      const enKeys = Object.keys(mod.en).sort();
      const viKeys = Object.keys(mod.vi).sort();

      const enSet = new Set(enKeys);
      const viSet = new Set(viKeys);

      const missingInVi = enKeys.filter((k) => !viSet.has(k));
      const missingInEn = viKeys.filter((k) => !enSet.has(k));

      expect(missingInVi, `${name}: keys present in en but missing in vi`).toEqual([]);
      expect(missingInEn, `${name}: keys present in vi but missing in en`).toEqual([]);

      // Full structural equality of the key sets (catches count + content mismatches).
      expect(viKeys).toEqual(enKeys);
      expect(viKeys.length).toBe(enKeys.length);
    });

    it('has no empty or whitespace-only string values in en', () => {
      const empties = Object.entries(mod.en)
        .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
        .map(([key]) => key);
      expect(empties, `${name}.en empty/blank values`).toEqual([]);
    });

    it('has no empty or whitespace-only string values in vi', () => {
      const empties = Object.entries(mod.vi)
        .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
        .map(([key]) => key);
      expect(empties, `${name}.vi empty/blank values`).toEqual([]);
    });
  });
});
