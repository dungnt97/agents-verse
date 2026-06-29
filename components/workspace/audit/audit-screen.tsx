/* =========================================================================
   AGENTS VERSE — Website Audit (master list + detail report)
   Receives audited leads + a leadId→AuditResult map via
   props (server-fetched from the repository layer).
   ========================================================================= */
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { ConfidenceRing } from '@/components/ui/confidence-ring';
import { SiteMock } from '@/components/site-mock';
import { hueFor, SCORE_LABELS, humanizeAuditError } from '@/lib/data/format';
import { useToast } from '@/lib/providers/toast-provider';
import { usePipelineAuditT } from '@/lib/i18n/keys/pipeline-audit';
import { requestAudit } from '@/lib/actions/run-audit';
import { requestDemoGeneration } from '@/lib/actions/run-demo-gen';
import type { Lead, AuditResult } from '@/lib/data/types';

// Client-safe view of an audit job (the audit-jobs repo is server-only; the page passes this
// minimal shape so this 'use client' component never imports server-only code).
export interface AuditJobView {
  status: string;
  error: string | null;
}

/* ---- Score colour helper ---- */
function scoreColor(v: number): string {
  return v >= 70 ? 'var(--success)' : v >= 45 ? 'var(--warning)' : 'var(--danger)';
}

/* ---- Animated score bar ---- */
interface ScoreBarProps {
  label: string;
  value: number;
}

function ScoreBar({ label, value }: ScoreBarProps) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = setTimeout(() => setW(value), 100); return () => clearTimeout(id); }, [value]);
  const col = scoreColor(value);
  return (
    <div>
      <div className="row between" style={{ marginBottom:7 }}>
        <span style={{ fontSize:13, color:'var(--ink-2)', whiteSpace:'nowrap' }}>{label}</span>
        <span className="mono" style={{ fontSize:12.5, fontWeight:600, color:col }}>{value}</span>
      </div>
      <div className="track" style={{ height:7 }}>
        <i style={{ width:w+'%', background:col }} />
      </div>
    </div>
  );
}

/* ---- AuditScreen ---- */

export interface AuditScreenProps {
  audited: Lead[];
  auditMap: Record<string, AuditResult>;
  // Serializable array from Server Component; converted to Set inside this component
  demoLeadIds: string[];
  // leadIds whose AI-generated redesign demo is ready to view (served at /demo/[leadId])
  generatedDemoLeadIds: string[];
  // leadId → audit job lifecycle state (queued/running/done/failed)
  jobMap: Record<string, AuditJobView>;
  initialLead?: string | null;
}

export function AuditScreen({ audited, auditMap, demoLeadIds, generatedDemoLeadIds, jobMap, initialLead }: AuditScreenProps) {
  // Build Set once for O(1) has() — demoLeadIds is a stable server-prefetched array
  const demoLeadSet = new Set(demoLeadIds);
  const { t } = usePipelineAuditT();
  const router = useRouter();
  const onAction = useToast();
  const [pending, startTransition] = useTransition();
  const goDemos = (id: string) => router.push('/demos?lead=' + id);
  // Generated redesign demos (built by the worker via the claude CLI) are served standalone.
  const generatedDemoSet = new Set(generatedDemoLeadIds);
  const openDemo = (id: string) => window.open('/demo/' + id, '_blank', 'noopener');
  const onGenerateDemo = (leadId: string) => {
    startTransition(async () => {
      const res = await requestDemoGeneration(leadId);
      onAction(res.message, res.ok ? 'success' : 'warning');
      router.refresh();
    });
  };

  // Queue a real audit for the selected lead (Inngest worker runs it); refresh to pick up state.
  const onRunAudit = (leadId: string) => {
    startTransition(async () => {
      const res = await requestAudit(leadId);
      onAction(res.message, res.ok ? 'success' : 'warning');
      router.refresh();
    });
  };

  // Select initial lead: use initialLead if it exists in audited list, else first audited lead
  const [sel, setSel] = useState<string>(
    initialLead && audited.find(l => l.id === initialLead) ? initialLead : audited[0]?.id ?? ''
  );

  // When initialLead prop changes (e.g. navigation), re-sync selection.
  useEffect(() => {
    if (initialLead && audited.find(l => l.id === initialLead)) {
      setSel(initialLead);
    }
  }, [initialLead, audited]);

  // While a queued/running audit is in flight on the worker, poll so the status badge + scores update
  // live (no manual refresh). Stops as soon as the job reaches a terminal state (done/failed).
  const jobStatus = jobMap[sel]?.status;
  useEffect(() => {
    if (jobStatus !== 'queued' && jobStatus !== 'running') return;
    const id = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(id);
  }, [jobStatus, router]);

  const a = auditMap[sel] ?? audited[0] as AuditResult | undefined;
  if (!a) return null;
  const hue = hueFor(a.industry);
  const hasDemo = demoLeadSet.has(sel);
  const hasGen = generatedDemoSet.has(sel);
  const job = jobMap[sel];
  const jobActive = pending || job?.status === 'queued' || job?.status === 'running';
  const jobStatusLabel =
    job?.status === 'running' ? t('audits.statusRunning')
    : job?.status === 'queued' ? t('audits.statusQueued')
    : job?.status === 'failed' ? t('audits.statusFailed')
    : null;

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - var(--shell-top))' }}>
      {/* Master rail */}
      <div style={{ width:264, flex:'none', borderRight:'1px solid var(--border)', background:'var(--surface)', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'20px 18px 12px' }}>
          <h1 style={{ fontSize:19, marginBottom:4 }}>{t('audits.screenTitle')}</h1>
          <p style={{ fontSize:12.5, color:'var(--ink-3)' }}>{audited.length} {t('audits.sitesScoredSuffix')}</p>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'4px 10px 16px' }}>
          {[...audited].sort((x, y) => (y.score - y.site) - (x.score - x.site)).map(l => {
            const active = l.id === sel;
            return (
              <button key={l.id} onClick={() => setSel(l.id)} className="focusable"
                style={{ width:'100%', textAlign:'left', padding:'11px 12px', borderRadius:11, marginBottom:4,
                  background: active ? 'var(--primary-soft)' : 'transparent', transition:'background .15s',
                  border:'none', cursor:'pointer' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                <div className="row between" style={{ marginBottom:5 }}>
                  <span className="row" style={{ gap:8, minWidth:0 }}>
                    <span style={{ width:8, height:8, borderRadius:99, background:`oklch(0.62 0.14 ${hueFor(l.industry)})`, flex:'none' }} />
                    <span style={{ fontSize:13, fontWeight: active?600:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                      color: active ? 'var(--primary)' : 'var(--ink)' }}>{l.company}</span>
                  </span>
                </div>
                <div className="row between">
                  <span style={{ fontSize:11.5, color:'var(--ink-3)' }}>{l.city}</span>
                  <span className="mono" style={{ fontSize:11 }}>
                    <span style={{color:'var(--danger)'}}>{l.site}</span>
                    <span style={{color:'var(--ink-4)'}}> → </span>
                    <span style={{color:'var(--success)'}}>{l.score}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report pane */}
      <div style={{ flex:1, minWidth:0, overflowY:'auto', padding:'26px 28px 60px' }}>
        <div style={{ maxWidth:980, margin:'0 auto' }}>
          {/* Header */}
          <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
            <div>
              <div className="row" style={{ gap:11, marginBottom:6 }}>
                <h1 style={{ fontSize:26, letterSpacing:'-0.03em', whiteSpace:'nowrap' }}>{a.company}</h1>
                <span className="badge badge-neutral">{t('audits.reportBadge')}</span>
              </div>
              <div className="row" style={{ gap:9, fontSize:13.5, color:'var(--ink-2)' }}>
                <span>{a.industry} · {a.city}</span>
                <span style={{width:3,height:3,borderRadius:99,background:'var(--border-strong)'}}/>
                <span className="row mono" style={{ gap:5, color:'var(--ink-3)' }}>
                  {a.url} <Icon name="external" size={12} />
                </span>
              </div>
            </div>
            <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
              {jobStatusLabel && (
                <span
                  className={'badge ' + (job?.status === 'failed' ? 'badge-danger' : job?.status === 'running' ? 'badge-info' : 'badge-warning')}
                  title={job?.status === 'failed' && job.error ? humanizeAuditError(job.error) : undefined}
                >
                  {job?.status === 'running' && <span className="pulse" style={{ background: 'var(--info)' }} />}
                  {jobStatusLabel}
                </span>
              )}
              {job?.status === 'failed' && job.error && (
                <span style={{ fontSize:12, color:'var(--danger)', flexBasis:'100%' }}>{humanizeAuditError(job.error)}</span>
              )}
              <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}}
                onClick={() => onRunAudit(sel)} disabled={jobActive}>
                <Icon name="search" size={14} /> {jobActive ? t('audits.auditing') : t('audits.runAudit')}
              </button>
              <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}}
                onClick={() => onAction('Assigned to Design Studio · '+a.company, 'success')}>
                {t('audits.assignToDesign')}
              </button>
              <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}}
                onClick={() => onAction('Escalated audit · '+a.company, 'warning')}>
                {t('audits.escalate')}
              </button>
              <button className="btn btn-primary btn-sm"
                onClick={() => hasGen ? openDemo(sel) : hasDemo ? goDemos(sel) : onGenerateDemo(sel)}>
                {hasGen || hasDemo ? t('audits.viewDemo') : t('audits.generateDemo')} <Icon name="arrowR" size={15}/>
              </button>
            </div>
          </div>

          {/* Overview row */}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.2fr) minmax(0,1fr)', gap:18, marginBottom:18 }} className="floor-grid">
            <div className="card" style={{ padding:16 }}>
              <div className="row between" style={{ marginBottom:12 }}>
                <span className="eyebrow" style={{color:'var(--ink-3)'}}>{t('audits.currentWebsite')}</span>
                <span className="badge badge-danger">{a.site}/100</span>
              </div>
              <SiteMock variant="old" hue={hue} label={a.url} />
            </div>
            <div className="card" style={{ padding:18, display:'flex', flexDirection:'column' }}>
              <div className="row" style={{ gap:18, marginBottom:14 }}>
                <div style={{ position:'relative', flex:'none' }}>
                  <ConfidenceRing value={a.site} size={76} sw={7} label={false} />
                  <div style={{ position:'absolute', inset:0, display:'grid', placeItems:'center' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.03em' }} className="tabular">{a.site}</div>
                      <div style={{ fontSize:9.5, color:'var(--ink-3)' }}>/ 100</div>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:13, color:'var(--ink-3)', marginBottom:3 }}>{t('audits.redesignOpportunity')}</div>
                  <div className="row" style={{ gap:8, alignItems:'baseline' }}>
                    <span style={{ fontSize:26, fontWeight:600, color:'var(--success)', letterSpacing:'-0.03em' }} className="tabular">+{a.score-a.site}</span>
                    <span style={{ fontSize:13, color:'var(--ink-2)' }}>to {a.score}/100</span>
                  </div>
                  <div className="row" style={{ gap:6, marginTop:8, fontSize:12, color:'var(--ink-3)' }}>
                    <Icon name="shield" size={13}/> {t('audits.aiConfidence')} {a.confidence}%
                  </div>
                </div>
              </div>
              <p style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.5, textWrap:'pretty' } as React.CSSProperties}>{a.summary}</p>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="card" style={{ padding:18, marginBottom:18 }}>
            <h2 style={{ fontSize:16, marginBottom:16 }}>{t('audits.scoreBreakdown')}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 32px' }} className="audit-scores">
              {SCORE_LABELS.map(([k, label]) => <ScoreBar key={k} label={label} value={a.scores[k as keyof typeof a.scores]} />)}
            </div>
          </div>

          {/* Problems + redesign direction */}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:18 }} className="floor-grid">
            <div className="card" style={{ padding:18 }}>
              <div className="row" style={{ gap:9, marginBottom:14 }}>
                <span style={{ width:28, height:28, borderRadius:8, background:'var(--danger-soft)', color:'var(--danger)', display:'grid', placeItems:'center' }}>
                  <Icon name="alert" size={15}/>
                </span>
                <h2 style={{ fontSize:16 }}>{t('audits.problemsDetected')}</h2>
              </div>
              <div className="col" style={{ gap:11 }}>
                {a.problems.map((p, i) => (
                  <div key={i} className="row" style={{ gap:11, alignItems:'flex-start' }}>
                    <span style={{ width:18, height:18, borderRadius:99, border:'1.5px solid var(--danger)', color:'var(--danger)', display:'grid', placeItems:'center', flex:'none', marginTop:1 }}>
                      <Icon name="x" size={11} sw={2.4}/>
                    </span>
                    <span style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.4 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ padding:18 }}>
              <div className="row" style={{ gap:9, marginBottom:14 }}>
                <span style={{ width:28, height:28, borderRadius:8, background:'var(--primary-soft)', color:'var(--primary)', display:'grid', placeItems:'center' }}>
                  <Icon name="spark" size={15}/>
                </span>
                <h2 style={{ fontSize:16 }}>{t('audits.suggestedRedesign')}</h2>
              </div>
              <div style={{ marginBottom:14 }}>
                <div className="eyebrow" style={{ fontSize:9.5, marginBottom:6 }}>{t('audits.visualDirection')}</div>
                <div style={{ fontSize:14, fontWeight:600 }}>{a.redesign.style}</div>
              </div>
              <div style={{ marginBottom:14 }}>
                <div className="eyebrow" style={{ fontSize:9.5, marginBottom:8 }}>{t('audits.recommendedSections')}</div>
                <div className="row wrap" style={{ gap:7 }}>
                  {a.redesign.sections.map(s => (
                    <span key={s} className="chip" style={{ height:28, fontSize:11.5, cursor:'default' }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <div className="eyebrow" style={{ fontSize:9.5, marginBottom:5 }}>{t('audits.ctaStrategy')}</div>
                  <div style={{ fontSize:13, color:'var(--ink-2)' }}>{a.redesign.cta}</div>
                </div>
                <div>
                  <div className="eyebrow" style={{ fontSize:9.5, marginBottom:5 }}>{t('audits.contentAngle')}</div>
                  <div style={{ fontSize:13, color:'var(--ink-2)' }}>{a.redesign.content}</div>
                </div>
              </div>
              <div className="row between" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border-soft)' }}>
                <span className="row" style={{ gap:8, fontSize:13 }}>
                  <Icon name="layers" size={15} style={{color:'var(--ink-3)'}}/> {a.redesign.template}
                </span>
                <button className="btn btn-soft btn-sm"
                  onClick={() => hasGen ? openDemo(sel) : hasDemo ? goDemos(sel) : onGenerateDemo(sel)}>
                  {hasGen || hasDemo ? t('audits.viewDemo') : t('audits.generate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
