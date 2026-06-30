// Deterministic layout audit — renders the generated HTML headless and runs an in-page DOM check that
// flags MECHANICAL layout breakages the vision board can miss or skip (it is best-effort): horizontal
// overflow, VISIBLE text cut off by the viewport edge, wrapped nav/labels, a decorative vertical
// rule/spine crossing a centered heading (incl. ::before/::after pseudo-elements), and broken/zero-size
// images. WORKER-ONLY: playwright via dynamic import, no `server-only`, runs under tsx. In-page logic is a
// STRING expression (not a closure) to dodge the esbuild `__name` transform — see render.ts.
import { writeFile, unlink } from 'node:fs/promises';
import type { LayoutDefect } from './layout-defects';

interface PwPage {
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

// In-page audit (no regex — string methods only — to keep the injected expression escape-safe). Returns a
// JSON array of { severity, sel, issue }. Conservative + visibility-aware so a clean page yields [] and
// hidden drawers/menus + padded one-line badges are NOT false-flagged.
const AUDIT_SCRIPT = `(() => {
  const W = window.innerWidth;
  const out = [];
  const spineSeen = {};
  const add = (severity, sel, issue) => out.push({ severity, sel, issue });
  const sig = (el) => {
    const id = el.id ? '#' + el.id : '';
    const cn = (el.className && el.className.toString) ? el.className.toString().trim() : '';
    const cls = cn ? '.' + cn.split(' ').filter(Boolean).slice(0, 2).join('.') : '';
    return (el.tagName || '').toLowerCase() + id + cls;
  };
  const txt = (el) => (el.textContent || '').trim().slice(0, 44);
  // VISIBLE = not display:none/visibility:hidden/opacity:0 on the element OR any ancestor (catches a
  // closed off-screen drawer whose links would otherwise look "past the edge").
  const visible = (el) => {
    let n = el, depth = 0;
    while (n && n.nodeType === 1 && depth < 12) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      n = n.parentElement; depth++;
    }
    return true;
  };
  const paints = (cs) =>
    (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') ||
    (cs.backgroundImage && cs.backgroundImage !== 'none') ||
    parseFloat(cs.borderLeftWidth) > 0 || parseFloat(cs.borderRightWidth) > 0;

  // 1) the whole page scrolls horizontally — something is wider than the screen
  const sw = document.documentElement.scrollWidth;
  if (sw > W + 2) add('major', 'document', 'the page scrolls horizontally (content is ' + (sw - W) + 'px wider than the ' + W + 'px viewport) — an element overflows the screen');

  // 2) VISIBLE text that STRADDLES the viewport edge (partly on-screen, partly clipped) — genuinely cut off
  const textEls = [].slice.call(document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,li,td,th,label'));
  for (let i = 0; i < textEls.length; i++) {
    const el = textEls[i];
    const t = txt(el);
    if (t.length < 2 || !visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const straddlesLeft = r.left < -2 && r.right > 6;
    const straddlesRight = r.right > W + 2 && r.left < W - 6;
    if (straddlesLeft || straddlesRight) add('major', sig(el), 'the text "' + t + '" is clipped by the viewport edge (left ' + Math.round(r.left) + 'px, right ' + Math.round(r.right) + 'px vs width ' + W + 'px)');
  }

  // 3) nav links / badges that wrapped to a 2nd line — measured on CONTENT height (padding/border removed)
  const ctrls = [].slice.call(document.querySelectorAll('nav a, nav button, header a, header button, .btn, [class*="badge"], [class*="chip"], [class*="ticket"], [class*="eyebrow"], [class*="pill"]'));
  for (let i = 0; i < ctrls.length; i++) {
    const el = ctrls[i];
    const t = txt(el);
    if (t.length < 2 || !visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'block' || cs.display === 'flex' || cs.display === 'grid') continue;
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3 || 18;
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    const contentH = el.getBoundingClientRect().height - pad;
    if (contentH > lh * 1.7) add('minor', sig(el), 'the control/label "' + t + '" wraps onto two lines (content ' + Math.round(contentH) + 'px vs a ~' + Math.round(lh) + 'px line) — it should stay on one line (nowrap / smaller text / hamburger)');
  }

  // 4) a thin vertical decorative rule/spine (often a ::before/::after on an ancestor) crossing a centered heading
  const heads = [].slice.call(document.querySelectorAll('h1,h2,h3'));
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    if (txt(h).length < 3 || !visible(h)) continue;
    const hr = h.getBoundingClientRect();
    if (hr.width === 0) continue;
    const hcx = hr.left + hr.width / 2;
    let node = h.parentElement, depth = 0, flagged = false;
    while (node && depth < 6 && !flagged) {
      const nr = node.getBoundingClientRect();
      const spansHeading = nr.top <= hr.top + 6 && nr.bottom >= hr.bottom - 6;
      if (spansHeading) {
        const probes = [['::before', getComputedStyle(node, '::before')], ['::after', getComputedStyle(node, '::after')]];
        for (let p = 0; p < probes.length; p++) {
          const pe = probes[p][0], pcs = probes[p][1];
          if (!pcs || pcs.content === 'none' || pcs.content === 'normal' || pcs.content === '') continue;
          if (pcs.position !== 'absolute' && pcs.position !== 'fixed') continue;
          const pw = parseFloat(pcs.width), ph = parseFloat(pcs.height);
          if (!(pw > 0 && pw <= 14 && ph >= 50 && paints(pcs))) continue;
          const left = String(pcs.left || '');
          const centered = left.indexOf('50%') >= 0 || Math.abs(nr.left + nr.width / 2 - hcx) < hr.width * 0.28;
          if (centered) { const ssel = sig(node) + pe; if (!spineSeen[ssel]) { spineSeen[ssel] = 1; add('major', ssel, 'a thin vertical decorative rule/spine runs through the centered heading "' + txt(h) + '" (and likely other centered headings) — a decorative line must never cross or sit behind heading text; start a timeline spine BELOW the section heading, scoped to the steps only'); } flagged = true; break; }
        }
      }
      node = node.parentElement; depth++;
    }
  }

  // 5) broken / zero-size images (only VISIBLE ones)
  const imgs = [].slice.call(document.images);
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs[i];
    if (!visible(img)) continue;
    const r = img.getBoundingClientRect();
    if (img.complete && img.naturalWidth === 0 && r.width > 4 && r.height > 4) add('major', sig(img), 'an image source is broken — it finished loading with no pixels (a dead/invalid URL: ' + String(img.currentSrc || img.src || '').slice(0, 60) + ') — add an onerror fallback or use a valid image');
  }

  // Card groups must use grid/flex, not CSS multi-column (columns/column-count): multi-column reflows by
  // height and orphans cards (e.g. 4 testimonials in a 3-col masonry strands the 4th). Flag a visible
  // container in column mode holding >=3 block-level card-like children (own bg/border + padding). Prose /
  // tag-clouds (text/inline children) are legitimately multi-column and are NOT flagged. String methods only.
  const colConts = [].slice.call(document.querySelectorAll('*'));
  for (let ci = 0; ci < colConts.length; ci++) {
    const c = colConts[ci];
    const ccs = getComputedStyle(c);
    const colN = parseInt(ccs.columnCount, 10);
    if (!(colN >= 2 || (ccs.columnCount === 'auto' && ccs.columnWidth !== 'auto'))) continue;
    if (!visible(c)) continue;
    const kids = [].slice.call(c.children);
    let cards = 0;
    for (let ki = 0; ki < kids.length; ki++) {
      const kcs = getComputedStyle(kids[ki]);
      if (kcs.display === 'inline' || kcs.display === 'none') continue;
      const boxed = (kcs.backgroundColor !== 'rgba(0, 0, 0, 0)' && kcs.backgroundColor !== 'transparent') || parseFloat(kcs.borderTopWidth) > 0 || kcs.borderTopLeftRadius !== '0px';
      if (boxed && parseFloat(kcs.paddingTop) > 0) cards++;
    }
    if (cards >= 3) { add('major', sig(c), 'a group of ' + cards + ' cards uses CSS multi-column (columns/column-count) — it reflows by height and orphans cards (an uneven last column); use display:grid or flex with a column count that fills each row cleanly for the item count'); break; }
  }

  return JSON.stringify(out.slice(0, 24));
})()`;

// Header legibility probe (runs at the fresh top, before any scroll, so the header is in its real
// transparent/overlay state). Returns the header's box + dominant text colour, or null when the header is
// a solid opaque bar (fine on its own background) or absent. String expression (no closures).
const HEADER_PROBE = `(() => {
  const h = document.querySelector('header') || document.querySelector('[class*="header"]') || document.querySelector('[class*="nav"]');
  if (!h) return null;
  const cs = getComputedStyle(h);
  if (cs.position !== 'fixed' && cs.position !== 'sticky' && cs.position !== 'absolute') return null;
  const bg = cs.backgroundColor; const m = bg.indexOf('(');
  let alpha = 1; if (m >= 0) { const parts = bg.slice(m + 1, bg.indexOf(')')).split(','); alpha = parts.length > 3 ? parseFloat(parts[3]) : 1; }
  if (alpha >= 0.7 && cs.backgroundImage === 'none') return null;
  let color = cs.color; const els = [].slice.call(h.querySelectorAll('a, span, strong, b'));
  for (let i = 0; i < els.length; i++) { const e = els[i]; if ((e.textContent || '').trim() && getComputedStyle(e).display !== 'none') { color = getComputedStyle(e).color; break; } }
  const r = h.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, color };
})()`;

// Perceptual luminance (0..1) from an "rgb(r, g, b[, a])" string; null when unparseable.
function colorLuminance(c: string): number | null {
  const i = c.indexOf('(');
  if (i < 0) return null;
  const p = c.slice(i + 1, c.indexOf(')')).split(',');
  return (0.299 * (parseFloat(p[0]) || 0) + 0.587 * (parseFloat(p[1]) || 0) + 0.114 * (parseFloat(p[2]) || 0)) / 255;
}

const VIEWPORTS: ReadonlyArray<{ vp: 'desktop' | 'mobile'; width: number; height: number }> = [
  { vp: 'desktop', width: 1440, height: 900 },
  { vp: 'mobile', width: 390, height: 844 },
];

// Render `html` at desktop + mobile and collect mechanical layout defects. Waits (capped) for lazy images
// so a still-loading photo is not mis-flagged as broken. Best-effort + isolated: any failure yields no
// defects for that viewport rather than sinking the run.
export async function auditLayout(html: string): Promise<LayoutDefect[]> {
  const { chromium } = (await import('playwright')) as unknown as {
    chromium: { launch(opts: Record<string, unknown>): Promise<PwBrowser> };
  };
  const path = `/tmp/audit-${process.pid}-${Date.now()}.html`;
  await writeFile(path, html, 'utf8');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const defects: LayoutDefect[] = [];
  try {
    for (const { vp, width, height } of VIEWPORTS) {
      try {
        const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, deviceScaleFactor: 1 });
        const page = await context.newPage();
        await page.goto('file://' + path, { waitUntil: 'networkidle', timeout: 30000 });
        // PIXEL-ACCURATE header legibility: at the fresh top (no scroll yet) a transparent overlay header sits
        // over the hero — screenshot its strip, average the REAL background luminance (sharp 1x1), and compare
        // to the text colour. Flags dark-on-dark (unreadable) but NOT dark-on-light (readable) — no false alarm.
        try {
          const hp = await page.evaluate<{ x: number; y: number; w: number; h: number; color: string } | null>(HEADER_PROBE);
          if (hp && hp.w > 40 && hp.h > 8) {
            const shot = await (page as unknown as { screenshot(o: { clip: { x: number; y: number; width: number; height: number } }): Promise<Buffer> }).screenshot({
              clip: { x: Math.max(0, hp.x), y: Math.max(0, hp.y), width: Math.max(1, Math.min(width - Math.max(0, hp.x), hp.w)), height: Math.max(1, Math.min(hp.h, 220)) },
            });
            const sharpFn = (await import('sharp')).default as unknown as (b: Buffer) => { resize(w: number, h: number): { raw(): { toBuffer(): Promise<Buffer> } } };
            const px = await sharpFn(shot).resize(1, 1).raw().toBuffer();
            const bgLum = (0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]) / 255;
            const tLum = colorLuminance(hp.color);
            if (tLum !== null) {
              const contrast = (Math.max(bgLum, tLum) + 0.05) / (Math.min(bgLum, tLum) + 0.05);
              if (contrast < 2.5) {
                defects.push({ viewport: vp, severity: 'major', selector: 'header', issue: 'the transparent header text is low-contrast over the hero (~' + contrast.toFixed(1) + ':1, well under the ~3:1 minimum) — its brand/nav blends into the imagery; use light text + a subtle dark top-scrim (or a solid bar) so the header stays legible over the hero' });
              }
            }
          }
        } catch { /* header legibility probe is best-effort */ }
        await page.evaluate(SCROLL_SCRIPT);
        for (let i = 0; i < 15; i++) {
          const pending = await page.evaluate<number>(PENDING_IMAGES);
          if (pending <= 1) break;
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(300);
        const raw = await page.evaluate<string>(AUDIT_SCRIPT);
        const arr = JSON.parse(raw) as Array<{ severity: string; sel: string; issue: string }>;
        for (const d of arr) {
          defects.push({ viewport: vp, severity: d.severity === 'minor' ? 'minor' : 'major', selector: String(d.sel || ''), issue: String(d.issue || '') });
        }
        await context.close();
      } catch {
        // skip this viewport — never let the guard itself break a run
      }
    }
  } finally {
    await browser.close();
    await unlink(path).catch(() => {});
  }
  return defects;
}
