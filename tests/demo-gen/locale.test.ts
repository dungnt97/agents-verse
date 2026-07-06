import { describe, it, expect } from 'vitest';
import { demoLanguageForAddress } from '@/lib/demo-gen/locale';

describe('demoLanguageForAddress', () => {
  it('defaults English for the target markets', () => {
    expect(demoLanguageForAddress('123 Main St, Austin, TX 78701, USA')).toBe('English');
    expect(demoLanguageForAddress('10 High St, London, UK')).toBe('English');
    expect(demoLanguageForAddress('5 George St, Sydney NSW, Australia')).toBe('English');
    expect(demoLanguageForAddress(null)).toBe('English');
    expect(demoLanguageForAddress('')).toBe('English');
  });
  it('keeps Vietnamese for a Vietnam address', () => {
    expect(demoLanguageForAddress('12 Lê Lợi, Quận 1, Hồ Chí Minh, Vietnam')).toBe('Vietnamese');
    expect(demoLanguageForAddress('Đà Nẵng, Việt Nam')).toBe('Vietnamese');
  });
});
