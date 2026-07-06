import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWhatsAppSignature, parseWhatsAppInbound } from '@/lib/integrations/whatsapp-inbound';

const appSecret = 'app-secret-123';
const payload = '{"entry":[{"changes":[{"value":{"messages":[{"from":"84906200434","id":"wamid.A","timestamp":"1720000000","type":"text","text":{"body":"quan tâm gói này"}}]}}]}]}';
const sign = (body: string, secret = appSecret) => 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

describe('verifyWhatsAppSignature', () => {
  it('accepts a correctly signed body', () => {
    expect(verifyWhatsAppSignature({ appSecret, signatureHeader: sign(payload), payload })).toBe(true);
  });
  it('rejects a wrong secret, tampered body, malformed or missing header', () => {
    expect(verifyWhatsAppSignature({ appSecret, signatureHeader: sign(payload, 'other'), payload })).toBe(false);
    expect(verifyWhatsAppSignature({ appSecret, signatureHeader: sign('{}'), payload })).toBe(false);
    expect(verifyWhatsAppSignature({ appSecret, signatureHeader: 'md5=abc', payload })).toBe(false);
    expect(verifyWhatsAppSignature({ appSecret, signatureHeader: '', payload })).toBe(false);
    expect(verifyWhatsAppSignature({ appSecret: '', signatureHeader: sign(payload), payload })).toBe(false);
  });
});

describe('parseWhatsAppInbound', () => {
  it('extracts from + text + wamid + timestamp from an inbound text message', () => {
    expect(parseWhatsAppInbound(JSON.parse(payload))).toEqual({
      from: '84906200434',
      text: 'quan tâm gói này',
      id: 'wamid.A',
      timestamp: 1720000000,
    });
  });
  it('returns null for a delivery/read status event (no messages[])', () => {
    const status = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.A', status: 'delivered' }] } }] }] };
    expect(parseWhatsAppInbound(status)).toBeNull();
  });
  it('returns null for a non-text message (image/audio)', () => {
    const img = { entry: [{ changes: [{ value: { messages: [{ from: '84x', type: 'image', image: {} }] } }] }] };
    expect(parseWhatsAppInbound(img)).toBeNull();
  });
  it('returns null for junk shapes', () => {
    expect(parseWhatsAppInbound(null)).toBeNull();
    expect(parseWhatsAppInbound({})).toBeNull();
    expect(parseWhatsAppInbound({ entry: 'x' })).toBeNull();
  });
  it('synthesises a stable id when wamid is absent', () => {
    const noId = { entry: [{ changes: [{ value: { messages: [{ from: '8490', type: 'text', text: { body: 'hi' } }] } }] }] };
    expect(parseWhatsAppInbound(noId)?.id).toBe('8490:hi');
  });
});
