import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/integrations/resend', () => ({
  resendConfigured: vi.fn(() => true),
  sendEmail: vi.fn(async () => ({ ok: true, id: 'e1' })),
  outreachEmailHtml: vi.fn((body: string) => `<html>${body}</html>`),
}));
vi.mock('@/lib/integrations/whatsapp', () => ({
  whatsappConfigured: vi.fn(() => true),
  sendWhatsAppTemplate: vi.fn(async () => ({ ok: true, id: 'w1' })),
}));

import { outreachChannel, outreachChannelConfigured, recipientForChannel, sendOutreach } from '@/lib/integrations/outreach-channel';
import { sendEmail } from '@/lib/integrations/resend';
import { sendWhatsAppTemplate } from '@/lib/integrations/whatsapp';

const email = sendEmail as unknown as ReturnType<typeof vi.fn>;
const wa = sendWhatsAppTemplate as unknown as ReturnType<typeof vi.fn>;

const saved = { ...process.env };
beforeEach(() => {
  email.mockClear();
  wa.mockClear();
  delete process.env.OUTREACH_CHANNEL;
});
afterEach(() => {
  process.env = { ...saved };
});

const send = {
  leadId: 'lead-1',
  recipient: 'x',
  company: 'Acme',
  draft: { subject: 'Bản demo mới', body: 'Chào Acme' },
  demoUrl: 'https://app/demo/lead-1',
  unsubscribe: 'mailto:unsub',
};

describe('channel selection helpers', () => {
  it('defaults to email; OUTREACH_CHANNEL=whatsapp selects whatsapp', () => {
    expect(outreachChannel()).toBe('email');
    process.env.OUTREACH_CHANNEL = 'WhatsApp';
    expect(outreachChannel()).toBe('whatsapp');
  });
  it('recipientForChannel picks email vs phone', () => {
    const lead = { email: 'a@b.co', phone: '+84 906' };
    expect(recipientForChannel(lead, 'email')).toBe('a@b.co');
    expect(recipientForChannel(lead, 'whatsapp')).toBe('+84 906');
    expect(recipientForChannel({ email: null, phone: null }, 'whatsapp')).toBeNull();
  });
  it('outreachChannelConfigured checks the active channel', () => {
    expect(outreachChannelConfigured('email')).toBe(true);
    expect(outreachChannelConfigured('whatsapp')).toBe(true);
  });
});

describe('sendOutreach dispatch', () => {
  it('email channel → sendEmail with subject/body/unsubscribe/idempotency', async () => {
    const r = await sendOutreach({ ...send, recipient: 'owner@acme.co' });
    expect(r.ok).toBe(true);
    expect(wa).not.toHaveBeenCalled();
    expect(email).toHaveBeenCalledTimes(1);
    expect(email.mock.calls[0][0]).toMatchObject({
      to: 'owner@acme.co',
      subject: 'Bản demo mới',
      unsubscribe: 'mailto:unsub',
      idempotencyKey: 'outreach:lead-1',
    });
  });

  it('whatsapp channel → template with [company, demoUrl] params, to the phone', async () => {
    process.env.OUTREACH_CHANNEL = 'whatsapp';
    process.env.WHATSAPP_TEMPLATE_NAME = 'demo_tpl';
    process.env.WHATSAPP_TEMPLATE_LANG = 'vi';
    const r = await sendOutreach({ ...send, recipient: '+84906200434' });
    expect(r.ok).toBe(true);
    expect(email).not.toHaveBeenCalled();
    expect(wa).toHaveBeenCalledWith('+84906200434', 'demo_tpl', 'vi', ['Acme', 'https://app/demo/lead-1']);
  });
});
