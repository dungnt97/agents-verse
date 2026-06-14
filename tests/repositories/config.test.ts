import { describe, it, expect, afterEach, vi } from 'vitest';

// `lib/repositories/config.ts` exports `USE_DB = process.env.USE_DB === 'true'`, evaluated ONCE
// at module import. To test the import-time predicate per case, we stub the env var, reset the
// module registry, then dynamically import a fresh copy so it re-reads the current env. The strict
// `=== 'true'` means only the exact lowercase string 'true' yields true; everything else is false.
async function loadUseDb(): Promise<boolean> {
  vi.resetModules();
  const mod = await import('@/lib/repositories/config');
  return mod.USE_DB;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('repositories/config USE_DB flag', () => {
  it("is true when USE_DB === 'true'", async () => {
    vi.stubEnv('USE_DB', 'true');
    expect(await loadUseDb()).toBe(true);
  });

  it("is false when USE_DB === 'false'", async () => {
    vi.stubEnv('USE_DB', 'false');
    expect(await loadUseDb()).toBe(false);
  });

  it('is false when USE_DB is unset/undefined', async () => {
    vi.stubEnv('USE_DB', undefined);
    expect(await loadUseDb()).toBe(false);
  });

  it("is false for uppercase 'TRUE' (strict equality)", async () => {
    vi.stubEnv('USE_DB', 'TRUE');
    expect(await loadUseDb()).toBe(false);
  });

  it("is false for '1' (strict equality, not truthy-coercion)", async () => {
    vi.stubEnv('USE_DB', '1');
    expect(await loadUseDb()).toBe(false);
  });

  it("is false for the empty string ''", async () => {
    vi.stubEnv('USE_DB', '');
    expect(await loadUseDb()).toBe(false);
  });

  it('returns a boolean primitive (not a truthy/falsy coercion artifact)', async () => {
    vi.stubEnv('USE_DB', 'true');
    expect(typeof (await loadUseDb())).toBe('boolean');
  });
});
