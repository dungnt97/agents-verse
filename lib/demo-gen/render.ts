// Render a generated HTML string to a PNG so the model can VISUALLY critique its own output. The
// design critique and the QA pass both call this (at desktop and mobile widths). WORKER-ONLY:
// playwright via dynamic import (kept out of the web bundle), no `server-only` (runs under tsx).
//
// In-page logic is passed to evaluate() as STRINGS, not closures: under some tsx/esbuild transforms
// a transpiled closure references an injected `__name` helper absent in the browser ("__name is not
// defined"). A string expression sidesteps the transform.
import { writeFile } from 'node:fs/promises';

interface PwPage {
  goto(url: string, opts: { waitUntil: 'networkidle'; timeout: number }): Promise<unknown>;
  evaluate<R>(expression: string): Promise<R>;
  waitForTimeout(ms: number): Promise<void>;
  screenshot(opts: { path: string; type: 'png'; clip?: { x: number; y: number; width: number; height: number } }): Promise<Buffer>;
}
interface PwContext { newPage(): Promise<PwPage>; close(): Promise<void> }
interface PwBrowser { newContext(opts: Record<string, unknown>): Promise<PwContext>; close(): Promise<void> }

// Cap the critique screenshot height — the top several screens carry the verdict; a 7000px image is
// needless tokens for the vision pass.
const MAX_CRITIQUE_PX = 4600;

// Scroll the page in steps to trigger IntersectionObserver reveals + lazy images, then return up.
const SCROLL_SCRIPT =
  '(async () => { const s = (ms) => new Promise(r => setTimeout(r, ms));' +
  ' for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await s(200); }' +
  ' window.scrollTo(0, 0); await s(300); })()';

const PENDING_IMAGES = 'Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).length';

// Write `html` to `htmlPath`, render it at `viewportWidth`, and save a screenshot to `pngPath`.
// Waits (capped) for images so the model critiques the settled page, not blank placeholders.
export async function renderHtmlToPng(html: string, htmlPath: string, pngPath: string, viewportWidth = 1440): Promise<void> {
  await writeFile(htmlPath, html, 'utf8');
  const { chromium } = (await import('playwright')) as unknown as {
    chromium: { launch(opts: Record<string, unknown>): Promise<PwBrowser> };
  };
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const mobile = viewportWidth < 700;
    const context = await browser.newContext({
      viewport: { width: viewportWidth, height: mobile ? 844 : 900 },
      isMobile: mobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(SCROLL_SCRIPT);
    // Wait (capped ~8s) for lazy images to decode after the scroll triggered them.
    for (let i = 0; i < 20; i++) {
      const pending = await page.evaluate<number>(PENDING_IMAGES);
      if (pending <= 1) break;
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(500);
    const height = await page.evaluate<number>('document.body.scrollHeight');
    const width = await page.evaluate<number>('document.documentElement.scrollWidth || ' + viewportWidth);
    await page.screenshot({ path: pngPath, type: 'png', clip: { x: 0, y: 0, width, height: Math.min(height, MAX_CRITIQUE_PX) } });
    await context.close();
  } finally {
    await browser.close();
  }
}
