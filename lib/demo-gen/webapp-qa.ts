// Deterministic web-app QA — renders the generated HTML headless and collects RUNTIME health signals the
// layout audit + vision board don't cover: console/JS errors, broken (4xx/failed) asset requests, and
// basic accessibility (missing alt, unnamed controls, no lang/viewport/h1, tiny mobile tap targets). It
// complements layout-audit.ts (which checks LAYOUT). WORKER-ONLY: playwright via dynamic import, no
// `server-only`, runs under tsx. In-page logic is a STRING expression (not a closure) to dodge the esbuild
// `__name` transform — see render.ts.
import { writeFile, unlink } from 'node:fs/promises';
import type { QaFinding } from './qa-findings';

interface PwPage {
  on(event: string, handler: (arg: unknown) => void): void;
  goto(url: string, opts: { waitUntil: 'networkidle'; timeout: number }): Promise<unknown>;
  evaluate<R>(expression: string): Promise<R>;
  waitForTimeout(ms: number): Promise<void>;
}
interface PwContext { newPage(): Promise<PwPage>; close(): Promise<void> }
interface PwBrowser { newContext(opts: Record<string, unknown>): Promise<PwContext>; close(): Promise<void> }

const SCROLL_SCRIPT =
  '(async () => { const s = (ms) => new Promise(r => setTimeout(r, ms));' +
  ' for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await s(120); }' +
  ' window.scrollTo(0, 0); await s(200); })()';

const PENDING_IMAGES = 'Array.from(document.images).filter(i => !i.complete || i.naturalWidth === 0).length';

// In-page accessibility audit (string methods only, escape-safe). Returns JSON [{ severity, detail }].
const A11Y_SCRIPT = `(() => {
  const out = [];
  const add = (severity, detail) => out.push({ severity, detail });
  const txt = (el) => (el.textContent || '').trim();
  const imgs = [].slice.call(document.images);
  let noAlt = 0;
  for (let i = 0; i < imgs.length; i++) { if (!imgs[i].hasAttribute('alt')) noAlt++; }
  if (noAlt > 0) add(noAlt > 2 ? 'major' : 'minor', noAlt + ' image(s) have no alt attribute — screen readers cannot describe them; add descriptive alt text');
  const ctrls = [].slice.call(document.querySelectorAll('a,button'));
  let emptyCtrl = 0;
  for (let i = 0; i < ctrls.length; i++) {
    const c = ctrls[i];
    const inner = (c.querySelector && c.querySelector('img')) ? (c.querySelector('img').getAttribute('alt') || '') : '';
    const name = (txt(c) || c.getAttribute('aria-label') || c.getAttribute('title') || inner || '').trim();
    const r = c.getBoundingClientRect();
    if (!name && r.width > 0 && r.height > 0) emptyCtrl++;
  }
  if (emptyCtrl > 0) add(emptyCtrl > 2 ? 'major' : 'minor', emptyCtrl + ' link/button(s) have no accessible text (no visible label, aria-label, or title)');
  if (!document.documentElement.getAttribute('lang')) add('minor', 'the <html> element has no lang attribute — set it (e.g. lang="vi")');
  if (!document.querySelector('meta[name="viewport"]')) add('major', 'no <meta name=viewport> — the page will not scale correctly on mobile');
  const h1s = document.querySelectorAll('h1').length;
  if (h1s === 0) add('major', 'the page has no <h1> heading — add one top-level heading');
  else if (h1s > 1) add('minor', 'the page has ' + h1s + ' <h1> headings — there should be exactly one');
  if (window.innerWidth < 700) {
    let tiny = 0;
    for (let i = 0; i < ctrls.length; i++) { const r = ctrls[i].getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24)) tiny++; }
    if (tiny > 2) add('minor', tiny + ' tap target(s) are under 24px on mobile — enlarge them for touch');
  }
  return JSON.stringify(out.slice(0, 16));
})()`;

const VIEWPORTS: ReadonlyArray<{ width: number; height: number }> = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

// Render `html` at desktop + mobile and collect runtime QA findings. Best-effort + isolated: any failure
// yields no findings for that viewport rather than sinking the run.
export async function runWebappQa(html: string): Promise<QaFinding[]> {
  const { chromium } = (await import('playwright')) as unknown as {
    chromium: { launch(opts: Record<string, unknown>): Promise<PwBrowser> };
  };
  const path = `/tmp/qa-${process.pid}-${Date.now()}.html`;
  await writeFile(path, html, 'utf8');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const findings: QaFinding[] = [];
  try {
    for (const { width, height } of VIEWPORTS) {
      try {
        const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, deviceScaleFactor: 1 });
        const page = await context.newPage();
        const consoleErrors: string[] = [];
        const brokenAssets: string[] = [];
        page.on('console', (msg) => {
          const m = msg as { type?: () => string; text?: () => string };
          if (m.type && m.type() === 'error' && m.text) consoleErrors.push(m.text().slice(0, 160));
        });
        page.on('pageerror', (err) => { const e = err as { message?: string }; consoleErrors.push(String(e?.message || err).slice(0, 160)); });
        page.on('requestfailed', (req) => { const r = req as { url?: () => string }; if (r.url) brokenAssets.push(r.url().slice(0, 120)); });
        page.on('response', (res) => {
          const r = res as { status?: () => number; url?: () => string };
          if (r.status && r.status() >= 400 && r.url) brokenAssets.push(r.url().slice(0, 110) + ' (' + r.status() + ')');
        });
        await page.goto('file://' + path, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(SCROLL_SCRIPT);
        for (let i = 0; i < 15; i++) {
          const pending = await page.evaluate<number>(PENDING_IMAGES);
          if (pending <= 1) break;
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(300);
        const raw = await page.evaluate<string>(A11Y_SCRIPT);
        const a11y = JSON.parse(raw) as Array<{ severity: string; detail: string }>;
        for (const a of a11y) findings.push({ category: 'a11y', severity: a.severity === 'minor' ? 'minor' : 'major', detail: String(a.detail || '') });
        for (const c of consoleErrors) findings.push({ category: 'console', severity: 'major', detail: 'a JavaScript/console error fired on load: ' + c });
        for (const b of brokenAssets) findings.push({ category: 'asset', severity: 'major', detail: 'a request failed or returned an error — broken asset/link: ' + b });
        await context.close();
      } catch {
        // skip this viewport — never let QA itself break a run
      }
    }
  } finally {
    await browser.close();
    await unlink(path).catch(() => {});
  }
  return findings;
}
