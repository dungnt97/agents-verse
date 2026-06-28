// Pure, self-contained HTML for the proposal PDF — concrete colours + inline styles (no app CSS vars)
// so the worker can render it standalone via Playwright page.pdf(). Mirrors the in-app ProposalDocument.
import type { ProposalDoc } from './proposal';

const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const money = (n: number): string => '$' + Math.round(n).toLocaleString('en-US');
const eyebrow = 'text-transform:uppercase;letter-spacing:.08em;font-size:10.5px;color:#8a8f98';

export function buildProposalHtml(doc: ProposalDoc, date: string): string {
  const lines = doc.lines
    .map(
      (l) =>
        `<tr><td style="padding:14px 0;border-top:1px solid #e7e3da"><div style="font-weight:600;font-size:15px">${esc(l.label)}</div><div style="font-size:12.5px;color:#8a8f98">${esc(l.detail)}</div></td><td style="padding:14px 0;border-top:1px solid #e7e3da;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap">${money(l.amount)}</td></tr>`,
    )
    .join('');
  const scope = doc.scope.map((s) => `<li>${esc(s)}</li>`).join('');
  const terms = doc.terms.map((t) => `<li>${esc(t)}</li>`).join('');
  const monthly =
    doc.monthly != null
      ? `<div style="font-size:13px;color:#4a5160;margin:6px 0 0">+ ${money(doc.monthly)} / month ongoing care (optional, billed separately)</div>`
      : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.ref)} — ${esc(doc.client)}</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b2430;background:#fff">
<div style="max-width:720px;margin:0 auto;padding:8px 4px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:34px">
    <div><div style="font-size:22px;font-weight:700;letter-spacing:-0.02em">${esc(doc.agency)}</div><div style="font-size:13px;color:#8a8f98;margin-top:2px">Web design proposal</div></div>
    <div style="text-align:right;font-size:12.5px;color:#8a8f98"><div style="font-variant-numeric:tabular-nums">${esc(doc.ref)}</div><div>${esc(date)}</div></div>
  </div>
  <div style="margin-bottom:30px"><div style="${eyebrow};margin-bottom:6px">Prepared for</div><div style="font-size:18px;font-weight:600">${esc(doc.client)}</div><div style="font-size:13.5px;color:#4a5160">${esc(doc.industry)} · ${esc(doc.city)}</div></div>
  <div style="${eyebrow};margin-bottom:4px">Investment</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px"><tbody>${lines}<tr><td style="padding:14px 0;border-top:2px solid #1b2430;font-weight:700">Total (one-time)</td><td style="padding:14px 0;border-top:2px solid #1b2430;text-align:right;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums">${money(doc.total)}</td></tr></tbody></table>
  ${monthly}
  <div style="${eyebrow};margin:26px 0 10px">What&apos;s included</div>
  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;color:#4a5160">${scope}</ul>
  <div style="${eyebrow};margin:26px 0 10px">Terms</div>
  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;color:#8a8f98">${terms}</ul>
  <div style="margin-top:34px;padding-top:16px;border-top:1px solid #e7e3da;font-size:12.5px;color:#8a8f98">${esc(doc.agency)} · ${esc(doc.package)} package · Thank you for considering us.</div>
</div></body></html>`;
}
