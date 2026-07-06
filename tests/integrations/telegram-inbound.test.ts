import { describe, it, expect } from 'vitest';
import { parseTelegramUpdate } from '@/lib/integrations/telegram-inbound';

describe('parseTelegramUpdate', () => {
  it('extracts updateId, chatId, text and a sender label from a text message', () => {
    const u = { update_id: 1, message: { chat: { id: 555 }, from: { username: 'jane', first_name: 'Jane' }, text: '/start' } };
    expect(parseTelegramUpdate(u)).toEqual({ updateId: 1, chatId: 555, text: '/start', from: 'jane', phone: null });
  });
  it('falls back to first_name when there is no username', () => {
    const u = { message: { chat: { id: 1 }, from: { first_name: 'Bob' }, text: 'hi' } };
    expect(parseTelegramUpdate(u)?.from).toBe('Bob');
  });
  it('captures a shared contact phone (digits only)', () => {
    const u = { message: { chat: { id: 2 }, from: { username: 'x' }, contact: { phone_number: '+84 906 200 434' } } };
    expect(parseTelegramUpdate(u)).toMatchObject({ chatId: 2, phone: '84906200434' });
  });
  it('returns null for updates with no usable message', () => {
    expect(parseTelegramUpdate(null)).toBeNull();
    expect(parseTelegramUpdate({})).toBeNull();
    expect(parseTelegramUpdate({ edited_message: { text: 'x' } })).toBeNull(); // not `message`
    expect(parseTelegramUpdate({ message: { chat: {}, text: 'x' } })).toBeNull(); // no chat id
    expect(parseTelegramUpdate({ message: { chat: { id: 1 }, from: {} } })).toBeNull(); // no text/contact
  });
});
