// Headless screenshot capture for vision scoring. WORKER-ONLY: playwright is loaded via a
// dynamic import so `next build` never pulls it (or Chromium) into the `web` bundle. No
// `server-only` — the worker runs this under tsx. Browsers come from the Playwright base image
// in Dockerfile.worker (version pinned to match the `playwright` package).

// Minimal structural types so this file does not statically import playwright (keeps it out of
// the web build graph); the real types resolve at runtime in the worker.
interface PwPage {
  setViewportSize(size: { width: number; height: number }): Promise<void>;
  goto(url: string, opts: { waitUntil: 'domcontentloaded'; timeout: number }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(opts: { fullPage: boolean; type: 'png' }): Promise<Buffer>;
  close(): Promise<void>;
}
interface PwContext { newPage(): Promise<PwPage>; close(): Promise<void> }
interface PwBrowser { newContext(opts: Record<string, unknown>): Promise<PwContext>; close(): Promise<void> }

export interface Screenshots {
  desktop: Buffer;
  mobile: Buffer;
}

const NAV_TIMEOUT_MS = 20000;
const SETTLE_MS = 600;

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
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || // link-local / cloud metadata
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new Error(`blocked non-public host: ${host}`);
  return u.toString();
}

// Reuse one Browser across jobs (cheaper than relaunching). Lazily launched on first use.
let browserPromise: Promise<PwBrowser> | null = null;

async function getBrowser(): Promise<PwBrowser> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = (await import('playwright')) as unknown as {
        chromium: { launch(opts: Record<string, unknown>): Promise<PwBrowser> };
      };
      // --no-sandbox is required to run Chromium as root inside the container.
      return chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    })();
  }
  return browserPromise;
}

async function shotAt(browser: PwBrowser, url: string, width: number, height: number, isMobile: boolean): Promise<Buffer> {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile,
    userAgent: 'AgentsVerseBot/1.0 (+website audit)',
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS); // let above-the-fold paint settle (avoid networkidle hangs)
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
