import { describe, it, expect } from 'vitest';
import { isOptOut } from '@/lib/data/opt-out';

describe('isOptOut — inbound opt-out detection', () => {
  it('matches bare and short keyword messages', () => {
    for (const t of ['STOP', 'stop', 'Stop.', 'unsubscribe', 'Unsub', 'opt out', 'opt-out', 'remove me', 'cancel', 'STOP ALL']) {
      expect(isOptOut(t)).toBe(true);
    }
  });

  it('matches natural opt-out phrasings', () => {
    for (const t of [
      'stop emailing me',
      'Please remove me from your list',
      'take me off this list',
      'unsubscribe me please',
      "please don't email me again",
      'do not contact me',
      'I no longer wish to receive these',
    ]) {
      expect(isOptOut(t)).toBe(true);
    }
  });

  it('does NOT opt out on a negated or unrelated reply (precision over recall)', () => {
    for (const t of [
      "please don't stop emailing me",
      'do not stop sending these, they help',
      'keep emailing me the updates',
      'how much does it cost?',
      'can we hop on a call?',
      "we're interested, send more info",
      'stopping by your office tomorrow',
      '',
    ]) {
      expect(isOptOut(t)).toBe(false);
    }
  });
});
