import { describe, it, expect } from 'vitest';
import { hasContact } from '@/lib/discovery/contactability';

describe('hasContact', () => {
  it('is true when a phone OR an email is present', () => {
    expect(hasContact({ phone: '+1 415 555 0100', email: null })).toBe(true);
    expect(hasContact({ phone: null, email: 'owner@salon.com' })).toBe(true);
    expect(hasContact({ phone: '+1...', email: 'a@b.co' })).toBe(true);
  });
  it('is false when neither is present or both are blank/whitespace', () => {
    expect(hasContact({ phone: null, email: null })).toBe(false);
    expect(hasContact({ phone: '', email: '' })).toBe(false);
    expect(hasContact({ phone: '   ', email: '  ' })).toBe(false);
    expect(hasContact({})).toBe(false);
  });
});
