'use client';
/* Branded, print-ready proposal document. Print-isolation CSS hides the app shell so the browser's
   "Save as PDF" yields a clean one-document PDF. */
import { fmt } from '@/lib/data/format';
import type { ProposalDoc } from '@/lib/proposals/proposal';

const PRINT_CSS =
  '@media print {' +
  ' body * { visibility: hidden !important; }' +
  ' #proposal-doc, #proposal-doc * { visibility: visible !important; }' +
  ' #proposal-doc { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }' +
  ' .no-print { display: none !important; }' +
  ' }';

export function ProposalDocument({ doc, date }: { doc: ProposalDoc; date: string }) {
  return (
    <>
      <style>{PRINT_CSS}</style>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '26px 24px 80px' }}>
        <div className="row between no-print" style={{ marginBottom: 18 }}>
          <a href="/deals" className="row" style={{ gap: 7, fontSize: 13, color: 'var(--ink-3)' }}>
            <Icon /> Back to deals
          </a>
          <button className="btn btn-primary" onClick={() => window.print()}>Save as PDF / Print</button>
        </div>

        <div id="proposal-doc" className="card" style={{ padding: 48 }}>
          <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 36 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{doc.agency}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>Web design proposal</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12.5, color: 'var(--ink-3)' }}>
              <div className="mono">{doc.ref}</div>
              <div>{date}</div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Prepared for</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{doc.client}</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{doc.industry} · {doc.city}</div>
          </div>

          <div className="eyebrow" style={{ marginBottom: 4 }}>Investment</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <tbody>
              {doc.lines.map((l, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 0' }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{l.label}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{l.detail}</div>
                  </td>
                  <td className="mono" style={{ padding: '14px 0', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{fmt.money(l.amount)}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--ink)' }}>
                <td style={{ padding: '14px 0', fontWeight: 700 }}>Total (one-time)</td>
                <td className="mono" style={{ padding: '14px 0', textAlign: 'right', fontSize: 18, fontWeight: 700 }}>{fmt.money(doc.total)}</td>
              </tr>
            </tbody>
          </table>
          {doc.monthly != null && (
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 6 }}>+ {fmt.money(doc.monthly)} / month ongoing care (optional, billed separately)</div>
          )}

          <div className="eyebrow" style={{ margin: '26px 0 10px' }}>What&apos;s included</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8, color: 'var(--ink-2)' }}>
            {doc.scope.map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <div className="eyebrow" style={{ margin: '26px 0 10px' }}>Terms</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--ink-3)' }}>
            {doc.terms.map((t, i) => <li key={i}>{t}</li>)}
          </ul>

          <div style={{ marginTop: 36, paddingTop: 18, borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--ink-3)' }}>
            {doc.agency} · {doc.package} package · Thank you for considering us.
          </div>
        </div>
      </div>
    </>
  );
}

function Icon() {
  return <span aria-hidden style={{ transform: 'rotate(180deg)', display: 'inline-block' }}>➜</span>;
}
