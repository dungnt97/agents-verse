import 'server-only';
import { isIP } from 'node:net';

// SSRF guard for fetching lead URLs. Discovery fetches business homepages that come from Google Places
// (attacker-influenceable) from INSIDE the Docker network, where db:5432 / redis / inngest:8288 /
// 9router:20128 and the cloud metadata endpoint live. A URL (or a public URL that 30x-redirects) must not
// be able to reach any of them. We reject by hostname SHAPE (Docker service DNS names are dotless; the
// literal-IP forms alias loopback/private ranges) and re-validate on every redirect hop.
//
// Deterministic + dependency-free (no DNS resolution), matching lib/audit/screenshot.ts. This does NOT
// stop DNS rebinding (a public domain with a private A record) — closing that would need a custom
// dispatcher that pins the resolved IP; accepted as residual given the semi-trusted input.

function isPrivateIp(ip: string): boolean {
  if (
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) || // link-local / cloud metadata (169.254.169.254)
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip === '0.0.0.0'
  ) {
    return true;
  }
  const l = ip.toLowerCase();
  if (l === '::1' || l === '::') return true;
  if (l.startsWith('fe80:') || l.startsWith('fc') || l.startsWith('fd')) return true; // IPv6 link-local / ULA
  const mapped = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); // IPv4-mapped IPv6
  if (mapped) return isPrivateIp(mapped[1]);
  return false;
}

// Validate a single URL: http(s) only + a public hostname shape.
export function assertPublicUrl(raw: string): URL {
  // Only assume https:// for a genuinely schemeless input (a bare host). A URL that already carries a
  // scheme is parsed as-is, so `ftp://` / `file://` reach the protocol check instead of being mangled
  // into `https://ftp://…` (which would sail past it and be judged only on the "host" `ftp`).
  const u = new URL(raw.includes('://') ? raw : `https://${raw}`);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`unsupported protocol: ${u.protocol}`);
  }
  const h = u.hostname.toLowerCase().replace(/\.$/, '');
  const blocked =
    h === 'localhost' ||
    h.endsWith('.local') ||
    !h.includes('.') || // dotless = a Docker compose service DNS name (db, redis, inngest, 9router, worker)
    /^\d+$/.test(h) || // integer IP form (http://2130706433 = 127.0.0.1)
    /^0x[0-9a-f]+$/.test(h) || // hex IP form
    (isIP(h) ? isPrivateIp(h) : false);
  if (blocked) throw new Error(`blocked non-public host: ${u.hostname}`);
  return u;
}

export interface SafeFetchResult {
  res: Response;
  finalUrl: string;
}

// Fetch with per-hop SSRF validation: follow redirects MANUALLY (capped), re-validating each Location so
// a public URL cannot 30x-redirect into an internal target. Throws (like fetch) on a blocked host or too
// many redirects — callers already treat a throw as "site unreachable".
export async function safeFetch(
  rawUrl: string,
  opts: { timeoutMs: number; headers?: Record<string, string> },
): Promise<SafeFetchResult> {
  let current = assertPublicUrl(rawUrl).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    for (let hop = 0; hop < 6; hop++) {
      const res = await fetch(current, { signal: controller.signal, redirect: 'manual', headers: opts.headers });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return { res, finalUrl: current };
        current = assertPublicUrl(new URL(loc, current).toString()).toString();
        continue;
      }
      return { res, finalUrl: current };
    }
    throw new Error('too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
