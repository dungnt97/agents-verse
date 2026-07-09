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
  screenshot(opts: { path: string; type: 'png'; fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } }): Promise<Buffer>;
}
interface PwContext { newPage(): Promise<PwPage>; close(): Promise<void> }
interface PwBrowser { newContext(opts: Record<string, unknown>): Promise<PwContext>; close(): Promise<void> }

// The critique screenshots feed a vision model AND are held in memory by both Chromium and the claude CLI,
// so they are the worker's peak-memory driver. Real venue photos make pages taller (more/bigger slices),
// which was OOM-killing the 2-4g worker mid-run. Bounds: HARD_MAX_PX guards a runaway page; each delivered
// slice stays around SLICE_PX for a legible resolution (a single very tall image downscales text to mush);
// and MAX_SLICES caps the slice COUNT so an extremely tall page can't balloon the image budget. A tall
// page is captured as ordered top→bottom slices — MAX_SLICES ≥ ceil(HARD_MAX_PX / SLICE_PX) = 5 so the cap
// never forces an over-tall slice. DEVICE_SCALE_FACTOR < 1 renders each slice at fewer pixels (still legible
// for critique) to keep the vision passes within the container's memory limit.
const HARD_MAX_PX = 13000;
const SLICE_PX = 2600;
const MAX_SLICES = 6;
const DEVICE_SCALE_FACTOR = 0.75;

// The viewport widths the board reviews at. Exported so the prompt labels each slice with the SAME
// width the page was actually rendered at (a mismatch makes reviewers reason about the wrong canvas).
export const DESKTOP_WIDTH = 1440;
export const MOBILE_WIDTH = 390;

// Scroll the page in steps to trigger IntersectionObserver reveals + lazy images, then return up.
const SCROLL_SCRIPT =
  '(async () => { const s = (ms) => new Promise(r => setTimeout(r, ms));' +
  ' for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await s(200); }' +
  ' window.scrollTo(0, 0); await s(300); })()';

const PENDING_IMAGES = 'Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).length';

// Write `html` to `htmlPath`, render it at `viewportWidth`, and save a screenshot to `pngPath`.
// Waits (capped) for images so the model critiques the settled page, not blank placeholders.
export async function renderHtmlToPng(html: string, htmlPath: string, pngPath: string, viewportWidth = DESKTOP_WIDTH): Promise<string[]> {
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
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
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
    const fullHeight = Math.min(await page.evaluate<number>('document.body.scrollHeight'), HARD_MAX_PX);
    const width = await page.evaluate<number>('document.documentElement.scrollWidth || ' + viewportWidth);
    // Slice the whole page top→bottom into <=MAX_SLICES legible tiles (one shot when it already fits).
    const nSlices = Math.min(MAX_SLICES, Math.max(1, Math.ceil(fullHeight / SLICE_PX)));
    const sliceH = Math.ceil(fullHeight / nSlices);
    const paths: string[] = [];
    for (let i = 0; i < nSlices; i++) {
      const y = i * sliceH;
      const h = Math.min(sliceH, fullHeight - y);
      if (h <= 0) break;
      const out = nSlices === 1 ? pngPath : pngPath.replace(/\.png$/i, `-${i}.png`);
      // `clip` alone is bounded by the viewport, so a y below the fold throws; `fullPage` makes the
      // resulting image the whole page so any slice region is valid.
      await page.screenshot({ path: out, type: 'png', fullPage: true, clip: { x: 0, y, width, height: h } });
      paths.push(out);
    }
    await context.close();
    return paths;
  } finally {
    await browser.close();
  }
}

// Render `html` to a print-quality A4 PDF (used for the deal proposal/quote the worker emails). Same
// worker-only playwright path as the PNG renderer; Chromium's page.pdf() needs no extra deps.
export async function renderHtmlToPdf(html: string, htmlPath: string, pdfPath: string): Promise<void> {
  await writeFile(htmlPath, html, 'utf8');
  const { chromium } = (await import('playwright')) as unknown as {
    chromium: {
      launch(opts: Record<string, unknown>): Promise<{
        newContext(o: Record<string, unknown>): Promise<{
          newPage(): Promise<{
            goto(u: string, o: { waitUntil: 'networkidle'; timeout: number }): Promise<unknown>;
            pdf(o: Record<string, unknown>): Promise<Buffer>;
          }>;
          close(): Promise<void>;
        }>;
        close(): Promise<void>;
      }>;
    };
  };
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({});
    const page = await context.newPage();
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle', timeout: 30000 });
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
    await context.close();
  } finally {
    await browser.close();
  }
}
