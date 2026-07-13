import { describe, it, expect } from 'vitest';
import { hasRealWebsite, isSocialOrDirectory, hasAuditableWebsite } from '@/lib/discovery/website-presence';

describe('isSocialOrDirectory', () => {
  it('flags social / directory / messaging profiles (not a site they own)', () => {
    for (const u of [
      'https://facebook.com/ruvenails',
      'http://www.instagram.com/ruve',
      'https://linktr.ee/ruve',
      'https://facebook.fr/x',
      'https://www.tripadvisor.co.uk/Restaurant',
      'https://yelp.com/biz/x',
      'https://g.page/ruve',
      'https://maps.app.goo.gl/abc',
      'https://t.me/ruve',
      'https://wa.me/15125550123',
    ]) {
      expect(isSocialOrDirectory(u)).toBe(true);
    }
  });

  it('does NOT flag a real standalone site', () => {
    for (const u of ['https://ruvenailspatx.com', 'http://bloomnails.com/book', 'mystudio.co.uk', 'https://sub.example.com']) {
      expect(isSocialOrDirectory(u)).toBe(false);
    }
  });
});

describe('hasRealWebsite (true → the auto-hunter SKIPS the lead)', () => {
  it('false when there is no URL', () => {
    expect(hasRealWebsite(null, true)).toBe(false);
    expect(hasRealWebsite(undefined, true)).toBe(false);
    expect(hasRealWebsite('', true)).toBe(false);
    expect(hasRealWebsite('   ', true)).toBe(false);
  });

  it('false for a social-only URL even if reachable (they still need a real site)', () => {
    expect(hasRealWebsite('https://instagram.com/ruve', true)).toBe(false);
  });

  it('false for a real domain that could not be fetched (dead / parked)', () => {
    expect(hasRealWebsite('https://deadsite.example', false)).toBe(false);
  });

  it('TRUE only for a real, reachable, standalone site', () => {
    expect(hasRealWebsite('https://ruvenailspatx.com', true)).toBe(true);
  });
});

describe('hasAuditableWebsite (false → the audit takes the greenfield path)', () => {
  it('true for a real URL or a bare domain (not mis-filed as greenfield)', () => {
    expect(hasAuditableWebsite('https://acme.com')).toBe(true);
    expect(hasAuditableWebsite('acme.com')).toBe(true);
    expect(hasAuditableWebsite('http://sub.acme.co.uk/path')).toBe(true);
  });

  it('false for the greenfield placeholder, empty, and unparseable values', () => {
    expect(hasAuditableWebsite('(no site yet)')).toBe(false);
    expect(hasAuditableWebsite('')).toBe(false);
    expect(hasAuditableWebsite('   ')).toBe(false);
    expect(hasAuditableWebsite(null)).toBe(false);
    expect(hasAuditableWebsite(undefined)).toBe(false);
  });

  it('false for a dotless internal host (never a public site)', () => {
    expect(hasAuditableWebsite('http://db:5432')).toBe(false);
    expect(hasAuditableWebsite('localhost')).toBe(false);
  });
});
