import { describe, it, expect, vi, afterEach } from 'vitest';
import { assertPublicUrl, safeFetch } from '@/lib/discovery/safe-fetch';

// SSRF guard: discovery fetches directory-sourced (attacker-influenceable) URLs from inside the Docker
// network. assertPublicUrl must reject every internal-target shape; safeFetch must re-check each redirect.

describe('assertPublicUrl — blocks non-public targets', () => {
  it('accepts ordinary public http(s) URLs (canonicalised)', () => {
    expect(assertPublicUrl('https://example.com').toString()).toBe('https://example.com/');
    expect(assertPublicUrl('example.com').toString()).toBe('https://example.com/'); // schemeless → https
    expect(assertPublicUrl('http://8.8.8.8').toString()).toBe('http://8.8.8.8/'); // public IP literal
  });

  it('rejects non-http(s) protocols', () => {
    expect(() => assertPublicUrl('ftp://example.com')).toThrow(/unsupported protocol/);
    expect(() => assertPublicUrl('file:///etc/passwd')).toThrow(/unsupported protocol/);
  });

  it('rejects loopback / localhost / .local', () => {
    for (const u of ['http://localhost', 'http://localhost:3000', 'https://printer.local', 'http://127.0.0.1', 'http://127.5.5.5']) {
      expect(() => assertPublicUrl(u), u).toThrow(/blocked non-public host/);
    }
  });

  it('rejects Docker compose service DNS names (dotless hosts)', () => {
    for (const u of ['http://db', 'http://redis:6379', 'http://inngest:8288', 'http://9router:20128', 'http://worker']) {
      expect(() => assertPublicUrl(u), u).toThrow(/blocked non-public host/);
    }
  });

  it('rejects private / link-local ranges and cloud metadata', () => {
    for (const u of ['http://10.0.0.5', 'http://192.168.1.1', 'http://172.16.0.1', 'http://172.31.255.255', 'http://169.254.169.254']) {
      expect(() => assertPublicUrl(u), u).toThrow(/blocked non-public host/);
    }
  });

  it('rejects integer / hex IP encodings and IPv6 loopback/ULA', () => {
    for (const u of ['http://2130706433', 'http://0x7f000001', 'http://[::1]', 'http://[fd00::1]', 'http://[fe80::1]']) {
      expect(() => assertPublicUrl(u), u).toThrow(/blocked non-public host/);
    }
  });
});

describe('safeFetch — per-hop redirect validation', () => {
  afterEach(() => vi.unstubAllGlobals());

  function res(init: { status: number; location?: string; body?: string }): Response {
    return {
      status: init.status,
      ok: init.status >= 200 && init.status < 300,
      headers: { get: (k: string) => (k.toLowerCase() === 'location' ? init.location ?? null : null) },
      text: async () => init.body ?? '',
    } as unknown as Response;
  }

  it('returns the response on a non-redirect status', async () => {
    const fn = vi.fn().mockResolvedValue(res({ status: 200, body: 'ok' }));
    vi.stubGlobal('fetch', fn);
    const out = await safeFetch('https://example.com', { timeoutMs: 1000 });
    expect(await out.res.text()).toBe('ok');
    expect((fn.mock.calls[0][1] as RequestInit).redirect).toBe('manual');
  });

  it('follows a redirect to another PUBLIC host', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce(res({ status: 301, location: 'https://elsewhere.com/x' }))
      .mockResolvedValueOnce(res({ status: 200, body: 'landed' }));
    vi.stubGlobal('fetch', fn);
    const out = await safeFetch('https://example.com', { timeoutMs: 1000 });
    expect(out.finalUrl).toBe('https://elsewhere.com/x');
    expect(await out.res.text()).toBe('landed');
  });

  it('rejects a redirect that points at an internal host', async () => {
    const fn = vi.fn().mockResolvedValue(res({ status: 302, location: 'http://db:5432/' }));
    vi.stubGlobal('fetch', fn);
    await expect(safeFetch('https://evil-lead.com', { timeoutMs: 1000 })).rejects.toThrow(/blocked non-public host/);
  });

  it('rejects a redirect to the cloud metadata endpoint', async () => {
    const fn = vi.fn().mockResolvedValue(res({ status: 302, location: 'http://169.254.169.254/latest/meta-data/' }));
    vi.stubGlobal('fetch', fn);
    await expect(safeFetch('https://evil-lead.com', { timeoutMs: 1000 })).rejects.toThrow(/blocked non-public host/);
  });
});
