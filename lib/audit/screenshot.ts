// Headless screenshot capture for vision scoring. WORKER-ONLY: playwright is loaded via a
// dynamic import so `next build` never pulls it (or Chromium) into the `web` bundle. No
// `server-only` — the worker runs this under tsx. Browsers come from the Playwright base image
// in Dockerfile.worker (version pinned to match the `playwright` package).

// Minimal structural types so this file does not statically import playwright (keeps it out of
// the web build graph); the real types resolve at runtime in the worker.
interface PwRoute {
  request(): { url(): string };
  continue(): Promise<void>;
  abort(): Promise<void>;
}
interface PwPage {
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  goto(url: string, opts: { waitUntil: 'domcontentloaded'; timeout: number }): Promise<unknown>;
  route(pattern: string, handler: (route: PwRoute) => void): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  // No-arg in-page evaluate (returns a JSON-serializable value) — used to scroll, dismiss
  // overlays and poll image-load state without statically importing playwright's types.
  evaluate<R>(fn: () => R | Promise<R>): Promise<R>;
  screenshot(opts: { fullPage?: boolean; type: 'png'; clip?: { x: number; y: number; width: number; height: number } }): Promise<Buffer>;
  close(): Promise<void>;
}
interface PwContext { newPage(): Promise<PwPage>; close(): Promise<void> }
interface PwBrowser {
  newContext(opts: Record<string, unknown>): Promise<PwContext>;
  close(): Promise<void>;
  on(event: 'disconnected', cb: () => void): void;
}

export interface Screenshots {
  desktop: Buffer;
  mobile: Buffer;
}

const NAV_TIMEOUT_MS = 20000;
const SETTLE_MS = 600;
// Lazy-loaded sites (listings, e-commerce, infinite feeds) defer below-the-fold images until they
// scroll into view. A flat short wait captures a page full of blank placeholder boxes, which the
// vision model then scores as "missing images / broken / cluttered". So before the full-page shot
// we dismiss consent overlays, auto-scroll to trigger lazy media, then wait (capped) for images to
// finish — every step is best-effort and never aborts the capture.
const IMG_WAIT_CAP_MS = 5000;
const CAPTURE_MAX_PX = 6000;

// Basic SSRF guard: lead.url is external discovery data, and the worker fetches it. Reject
// non-http(s) and obvious non-public hosts (localhost, link-local/metadata, private ranges) by
// literal hostname. Not full DNS-rebinding protection, but blocks the easy internal-target cases.
function assertSafeUrl(raw: string): string {
  const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`unsupported protocol: ${u.protocol}`);
  }
  const host = u.hostname.toLowerCase();
  const blocked =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    // Dotless hostnames are never public sites but ARE the compose service DNS names (db, redis,
    // inngest, 9router, worker, web) — the highest-value internal targets from inside the network.
    !host.includes('.') ||
    // Single-integer / hex forms (http://2130706433, http://0x7f000001) alias loopback & friends.
    /^\d+$/.test(host) ||
    /^0x[0-9a-f]+$/.test(host) ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || // link-local / cloud metadata
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new Error(`blocked non-public host: ${host}`);
  return u.toString();
}

// Reuse one Browser across jobs (cheaper than relaunching). Lazily launched on first use.
// The cache must never hold a DEAD browser: a failed launch clears itself (otherwise the rejected
// promise is served to every later job), and a Chromium crash (OOM under the container mem_limit)
// clears it via 'disconnected' so the next job relaunches instead of failing until a manual restart.
let browserPromise: Promise<PwBrowser> | null = null;

async function getBrowser(): Promise<PwBrowser> {
  if (!browserPromise) {
    const launching = (async () => {
      const { chromium } = (await import('playwright')) as unknown as {
        chromium: { launch(opts: Record<string, unknown>): Promise<PwBrowser> };
      };
      // --no-sandbox is required to run Chromium as root inside the container.
      const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
      browser.on('disconnected', () => {
        if (browserPromise === launching) browserPromise = null;
      });
      return browser;
    })();
    browserPromise = launching;
    launching.catch(() => {
      if (browserPromise === launching) browserPromise = null;
    });
  }
  return browserPromise;
}

// Best-effort: close cookie/consent popups that otherwise overlay the screenshot. Clicks buttons
// whose label matches common accept/close wording, then hides any large fixed/sticky high-z overlay
// still covering the viewport. Heuristic by design — wrapped so a failure never breaks the capture.
async function dismissOverlays(page: PwPage): Promise<void> {
  try {
    await page.evaluate(() => {
      const accept = ['đóng', 'đồng ý', 'tôi đồng ý', 'chấp nhận', 'accept', 'agree', 'got it', 'ok', 'allow all', 'close'];
      for (const el of Array.from(document.querySelectorAll('button, a, [role="button"]'))) {
        const t = (el.textContent || '').trim().toLowerCase();
        if (t && t.length < 30 && accept.some((w) => t === w || t.includes(w))) (el as HTMLElement).click();
      }
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('div, section, aside'))) {
        const s = getComputedStyle(el);
        if ((s.position === 'fixed' || s.position === 'sticky') && Number(s.zIndex || 0) >= 100) {
          const r = el.getBoundingClientRect();
          if (r.height > 60 && r.width > window.innerWidth * 0.6) el.style.display = 'none';
        }
      }
    });
  } catch {
    /* overlay handling is opportunistic */
  }
}

// Scroll the whole page in steps so IntersectionObserver-based lazy loaders fetch their images,
// then return to the top for the capture. Step pacing + max distance are inlined (the function body
// runs in the browser context and cannot read Node module constants).
async function autoScroll(page: PwPage): Promise<void> {
  try {
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const step = Math.round(window.innerHeight * 1.5);
      const max = Math.min(document.body.scrollHeight, 6000);
      for (let y = 0; y <= max; y += step) {
        window.scrollTo(0, y);
        await sleep(450);
      }
      window.scrollTo(0, 0);
    });
  } catch {
    /* scrolling is opportunistic */
  }
}

// Poll (host-side, time-capped) until nearly all images have decoded. Some images are legitimately
// broken/never-loading, so we stop at a small residual rather than requiring zero.
async function waitForImages(page: PwPage, capMs: number): Promise<void> {
  const deadline = Date.now() + capMs;
  try {
    while (Date.now() < deadline) {
      const pending = await page.evaluate(
        () => Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0).length,
      );
      if (pending <= 2) break;
      await page.waitForTimeout(300);
    }
  } catch {
    /* image-wait is best-effort */
  }
}

async function shotAt(browser: PwBrowser, url: string, width: number, height: number, isMobile: boolean): Promise<Buffer> {
  // Real browser UA per device: bot-identifying UAs get aggressively challenged by CDNs
  // (Cloudflare et al.), which serve a stripped page the vision model then mis-scores as broken.
  const userAgent = isMobile
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    userAgent,
  });
  const page = await context.newPage();
  try {
    // Per-request SSRF guard: validating only the entry URL leaves Chromium free to follow a 3xx redirect
    // or load a subresource pointing at an internal host (db/redis/inngest, cloud metadata) from inside the
    // Docker network. Re-check EVERY request the page makes and abort any non-public target — this covers
    // redirect hops and subresources, not just the first navigation.
    await page.route('**/*', (route) => {
      try {
        assertSafeUrl(route.request().url());
        void route.continue();
      } catch {
        void route.abort();
      }
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS); // let above-the-fold paint settle (avoid networkidle hangs)
    await dismissOverlays(page);
    await autoScroll(page); // trigger lazy-loaded media before the full-page shot
    await waitForImages(page, IMG_WAIT_CAP_MS);
    await page.waitForTimeout(SETTLE_MS); // final paint settle after scroll-to-top
    const dims = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth || document.body.scrollWidth,
      h: document.body.scrollHeight,
    }));
    if (dims.h > CAPTURE_MAX_PX) {
      return await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: dims.w, height: CAPTURE_MAX_PX } });
    }
    return await page.screenshot({ fullPage: true, type: 'png' });
  } finally {
    await context.close();
  }
}

// Capture desktop + mobile sequentially (parallel contexts double peak memory on a small VPS).
export async function captureScreenshots(url: string): Promise<Screenshots> {
  const target = assertSafeUrl(url);
  const browser = await getBrowser();
  const desktop = await shotAt(browser, target, 1440, 900, false);
  const mobile = await shotAt(browser, target, 390, 844, true);
  return { desktop, mobile };
}

// Called by the worker entrypoint on SIGTERM so the browser process exits cleanly.
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    browserPromise = null;
    if (b) await b.close().catch(() => {});
  }
}

