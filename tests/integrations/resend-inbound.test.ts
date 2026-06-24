import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyResendSignature, extractEmailAddress, parseInboundEmail } from '@/lib/integrations/resend-inbound';

// The inbound webhook is a PUBLIC endpoint that injects events into the deal pipeline, so signature
// verification is the security boundary. These pin: a correctly-signed body passes; any tampering with
// the secret, payload, id, timestamp, or signature fails.
const SECRET_KEY = Buffer.from('a-32-byte-test-signing-key-000000').toString('base64');
const secret = `whsec_${SECRET_KEY}`;

function sign(id: string, timestamp: string, payload: string): string {
  const key = Buffer.from(SECRET_KEY, 'base64');
  return 'v1,' + createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64');
}

describe('verifyResendSignature', () => {
  const id = 'msg_123';
  const timestamp = '1700000000';
  const payload = '{"type":"email.received"}';

  it('accepts a correctly-signed payload', () => {
    expect(verifyResendSignature({ secret, id, timestamp, signature: sign(id, timestamp, payload), payload })).toBe(true);
  });

  it('accepts when one of several space-separated signatures matches (key rotation)', () => {
    const sig = `v1,deadbeef ${sign(id, timestamp, payload)}`;
    expect(verifyResendSignature({ secret, id, timestamp, signature: sig, payload })).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const sig = sign(id, timestamp, payload);
    expect(verifyResendSignature({ secret, id, timestamp, signature: sig, payload: payload + 'x' })).toBe(false);
  });

  it('rejects the wrong secret', () => {
    const sig = sign(id, timestamp, payload);
    expect(verifyResendSignature({ secret: 'whsec_' + Buffer.from('other-key').toString('base64'), id, timestamp, signature: sig, payload })).toBe(false);
  });

  it('rejects a swapped id / timestamp (replay across messages)', () => {
    const sig = sign(id, timestamp, payload);
    expect(verifyResendSignature({ secret, id: 'msg_other', timestamp, signature: sig, payload })).toBe(false);
    expect(verifyResendSignature({ secret, id, timestamp: '1700000999', signature: sig, payload })).toBe(false);
  });

  it('rejects empty / missing headers', () => {
    expect(verifyResendSignature({ secret, id: '', timestamp, signature: sign(id, timestamp, payload), payload })).toBe(false);
    expect(verifyResendSignature({ secret, id, timestamp, signature: '', payload })).toBe(false);
  });
});

describe('extractEmailAddress', () => {
  it('pulls the address out of "Name <addr>" and lowercases it', () => {
    expect(extractEmailAddress('Jane Doe <Jane@Example.COM>')).toBe('jane@example.com');
  });
  it('accepts a bare address', () => {
    expect(extractEmailAddress('owner@shop.vn')).toBe('owner@shop.vn');
  });
  it('handles the { address } object shape', () => {
    expect(extractEmailAddress({ address: 'a@b.io' })).toBe('a@b.io');
  });
  it('rejects a non-email string', () => {
    expect(extractEmailAddress('not an email')).toBeNull();
  });
});

describe('parseInboundEmail', () => {
  it('reads from + text out of a Resend-shaped payload', () => {
    const out = parseInboundEmail({ type: 'email.received', data: { from: 'A <a@b.io>', text: 'Interested!' } });
    expect(out).toEqual({ from: 'a@b.io', text: 'Interested!' });
  });
  it('falls back to tag-stripped html when text is absent', () => {
    const out = parseInboundEmail({ data: { from: 'a@b.io', html: '<p>Yes please</p>' } });
    expect(out?.text).toBe('Yes please');
  });
  it('returns null when the sender is unparseable', () => {
    expect(parseInboundEmail({ data: { from: 'garbage', text: 'hi' } })).toBeNull();
    expect(parseInboundEmail(null)).toBeNull();
  });

  it('ignores non-inbound event types (Resend outbound delivery webhooks must not become replies)', () => {
    for (const type of ['email.sent', 'email.delivered', 'email.bounced', 'email.complained']) {
      expect(parseInboundEmail({ type, data: { from: 'us@agency.vn', text: 'delivered' } })).toBeNull();
    }
    // A genuine inbound type still parses.
    expect(parseInboundEmail({ type: 'inbound.email.received', data: { from: 'a@b.io', text: 'yes' } })).toEqual({
      from: 'a@b.io',
      text: 'yes',
    });
  });
});
