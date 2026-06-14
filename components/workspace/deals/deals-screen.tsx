/* =========================================================================
   AGENTS VERSE — Deals (approval flow · reply handling · production)
   Receives deals via props (server-fetched from the
   repository layer); looks up the selected deal by leadId.
   ========================================================================= */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { CountUp } from '@/components/ui/count-up';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { fmt, hueFor, DEAL_STAGE } from '@/lib/data/format';
import { useToast } from '@/lib/providers/toast-provider';
import { updateDealStage } from '@/lib/actions/deals';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import type { Deal, Production } from '@/lib/data/types';

/* ---- OverviewBand (local) — value via CountUp (rounds, ignores prefix), like the shared original ---- */

interface BandItem {
  label: string;
  value: number;
  icon: string;
  accent?: string;
  suffix?: string;
  prefix?: string;
}

function OverviewBand({ items }: { items: BandItem[] }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${items.length},minmax(0,1fr))`, gap:0,
      border:'1px solid var(--border)', borderRadius:16, background:'var(--surface)', overflow:'hidden', marginBottom:22 }} className="ov-band">
      {items.map((it, i) => (
        <div key={i} style={{ padding:'15px 18px', borderRight: i < items.length-1 ? '1px solid var(--border)' : 'none' }}>
          <div className="row" style={{ gap:7, marginBottom:8, color: it.accent||'var(--ink-3)' }}>
            <Icon name={it.icon} size={15} />
            <span style={{ fontSize:12, color:'var(--ink-3)', fontWeight:500 }}>{it.label}</span>
          </div>
          <div style={{ fontSize:24, fontWeight:600, letterSpacing:'-0.03em' }}>
            <CountUp end={it.value} suffix={it.suffix || ''} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- EmptyState (local) ---- */

function EmptyState({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="col center" style={{ padding:'60px 20px', textAlign:'center', border:'1px dashed var(--border-strong)', borderRadius:16, background:'var(--surface)' }}>
      <span style={{ width:52, height:52, borderRadius:14, display:'grid', placeItems:'center', background:'var(--surface-muted)', color:'var(--ink-3)', marginBottom:16 }}>
        <Icon name={icon} size={24} />
      </span>
      <div style={{ fontSize:17, fontWeight:600, marginBottom:6 }}>{title}</div>
      <p style={{ fontSize:14, color:'var(--ink-3)', maxWidth:340, lineHeight:1.45 }}>{sub}</p>
    </div>
  );
}

/* ---- ProbBar — win probability bar ---- */

function ProbBar({ value }: { value: number }) {
  const col = value >= 80 ? 'var(--success)' : value >= 55 ? 'var(--primary)' : 'var(--warning)';
  return (
    <div className="row" style={{ gap:9 }}>
      <div className="track" style={{ width:64, height:6 }}>
        <i style={{ width:value+'%', background:col }} />
      </div>
      <span className="mono" style={{ fontSize:12, color:'var(--ink-2)' }}>{value}%</span>
    </div>
  );
}

/* ---- DealCard ---- */

function DealCard({ d, onOpen }: { d: Deal; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const [hover, setHover] = useState(false);
  const st = DEAL_STAGE[d.stage];
  const escalated = d.stage === 'call' || d.stage === 'approval';
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onOpen(d.id)}
      className="card" style={{ padding:'15px 17px', cursor:'pointer', transition:'transform .18s, box-shadow .18s, border-color .18s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? 'var(--sh-md)' : 'var(--sh-sm)',
        borderColor: escalated
          ? 'color-mix(in oklab,var(--warning) 40%, var(--border))'
          : hover ? 'var(--border-strong)' : 'var(--border)' }}>
      <div className="row between" style={{ marginBottom:11 }}>
        <span className="row" style={{ gap:11, minWidth:0 }}>
          <span style={{ width:36, height:36, borderRadius:10,
            background:`oklch(0.62 0.13 ${hueFor(d.industry)} / .16)`,
            display:'grid', placeItems:'center', flex:'none' }}>
            <span style={{ width:9, height:9, borderRadius:99, background:`oklch(0.6 0.15 ${hueFor(d.industry)})` }} />
          </span>
          <span style={{ minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.client}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)' }}>{d.pkg} · {d.city}</div>
          </span>
        </span>
        <span className={'badge '+st.cls}>{t('dealStage.' + d.stage)}</span>
      </div>
      <div className="row between" style={{ alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11.5, color:'var(--ink-3)', marginBottom:2 }}>{t('deals.quotedLabel')}</div>
          <div className="row" style={{ gap:8, alignItems:'baseline' }}>
            <span style={{ fontSize:19, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{fmt.money(d.price)}</span>
            <span style={{ fontSize:12.5, color:'var(--ink-3)' }} className="tabular">/ {fmt.money(d.value)}</span>
          </div>
        </div>
        <ProbBar value={d.probability} />
      </div>
      {escalated && (
        <div className="row" style={{ gap:8, marginTop:12, paddingTop:11, borderTop:'1px solid var(--border-soft)' }}>
          <Icon name="alert" size={14} style={{ color:'var(--warning)', flex:'none', marginTop:1 }} />
          <span style={{ fontSize:12.5, color:'var(--ink-2)', lineHeight:1.4 }}>{d.escReason}</span>
        </div>
      )}
    </div>
  );
}

/* ---- ProductionTimeline ---- */

function ProductionTimeline({ p }: { p: Production }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="row between" style={{ marginBottom:14 }}>
        <span className="row" style={{ gap:8 }}>
          <span className="pulse" style={{background:'var(--primary)'}}/>
          <span style={{ fontSize:13.5, fontWeight:600 }}>{p.phase}</span>
        </span>
        <span style={{ fontSize:12, color:'var(--ink-3)' }}>{p.target}</span>
      </div>
      <div className="scroll-x" style={{ display:'flex', gap:0, marginBottom:16 }}>
        {p.stages.map((s, i) => (
          <div key={i} className="row" style={{ gap:0, flex:'none' }}>
            <div className="col center" style={{ gap:6, width:78 }}>
              <span style={{ width:24, height:24, borderRadius:99, display:'grid', placeItems:'center', flex:'none',
                background: s.done ? 'var(--success)' : s.current ? 'var(--primary)' : 'var(--surface-muted)',
                color: (s.done||s.current) ? '#fff' : 'var(--ink-3)',
                border: s.done||s.current ? 'none' : '1px solid var(--border)' }}>
                {s.done
                  ? <Icon name="check" size={13} sw={2.6}/>
                  : s.current
                    ? <span style={{width:7,height:7,borderRadius:99,background:'#fff'}}/>
                    : <span style={{fontSize:10}}>{i+1}</span>}
              </span>
              <span style={{ fontSize:10, textAlign:'center', lineHeight:1.2,
                color: s.current ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: s.current ? 600 : 400 }}>{s.name}</span>
            </div>
            {i < p.stages.length-1 && (
              <span style={{ width:14, height:2, background: s.done ? 'var(--success)' : 'var(--border)', marginTop:11, flex:'none' }} />
            )}
          </div>
        ))}
      </div>
      {p.blocker && (
        <div className="row" style={{ gap:9, padding:'10px 13px', borderRadius:10, background:'var(--warning-soft)', marginBottom:14 }}>
          <Icon name="alert" size={15} style={{color:'var(--warning)'}}/>
          <span style={{ fontSize:13, color:'var(--ink)' }}>{p.blocker}</span>
        </div>
      )}
      <div className="eyebrow" style={{ marginBottom:10 }}>{t('deals.assetsEyebrow')}</div>
      <div className="col" style={{ gap:8 }}>
        {p.assets.map((a, i) => (
          <div key={i} className="row between">
            <span className="row" style={{ gap:10 }}>
              <span style={{ width:18, height:18, borderRadius:6, display:'grid', placeItems:'center', flex:'none',
                background: a.got ? 'var(--success)' : 'var(--surface-muted)',
                color: a.got ? '#fff' : 'var(--ink-3)',
                border: a.got ? 'none' : '1px solid var(--border)' }}>
                {a.got ? <Icon name="check" size={12} sw={2.6}/> : <Icon name="clock" size={11}/>}
              </span>
              <span style={{ fontSize:13, color: a.got ? 'var(--ink-2)' : 'var(--ink)' }}>{a.name}</span>
            </span>
            <span style={{ fontSize:11.5, color: a.got ? 'var(--success)' : 'var(--warning)', fontWeight:600 }}>
              {a.got ? t('deals.assetReceived') : t('deals.assetPending')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- DealDrawer ---- */

function DealDrawer({ deal, onClose, onAction }: { deal: Deal; onClose: () => void; onAction: (msg: string, kind?: string) => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const { useDb } = useWorkspaceState();
  const [pending, startTransition] = useTransition();
  const d = deal;
  const st = DEAL_STAGE[d.stage];
  const escalated = d.stage === 'call' || d.stage === 'approval';

  // Persist a stage change then refresh. In demo mode (no DB) fall back to a cosmetic toast so
  // the action doesn't degrade to a "needs DB" warning.
  const changeStage = (stage: Parameters<typeof updateDealStage>[1], successMsg: string) => {
    if (!useDb) { onAction(successMsg, 'success'); return; }
    startTransition(async () => {
      const r = await updateDealStage(d.id, stage);
      onAction(r.message ?? successMsg, r.ok ? 'success' : 'warning');
      router.refresh();
    });
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(20,18,12,.4)', backdropFilter:'blur(2px)', animation:'fade-in .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:560, maxWidth:'95vw', zIndex:121, background:'var(--surface)',
        borderLeft:'1px solid var(--border)', boxShadow:'var(--sh-xl)', display:'flex', flexDirection:'column',
        animation:'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>

        {/* Header */}
        <div className="row between" style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flex:'none' }}>
          <div>
            <div className="row" style={{gap:10}}>
              <div style={{ fontSize:16.5, fontWeight:600 }}>{d.client}</div>
              <span className={'badge '+st.cls}>{t('dealStage.' + d.stage)}</span>
            </div>
            <div style={{ fontSize:12.5, color:'var(--ink-3)', marginTop:3 }}>{d.industry} · {d.city}</div>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor:'var(--border)' }}>
            <Icon name="x" size={17} />
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {/* Quote summary tiles */}
          <div className="row" style={{ gap:12, marginBottom:20 }}>
            {([
              [t('deals.tilePackage'),  d.pkg],
              [t('deals.tileQuoted'),   fmt.money(d.price)],
              [t('deals.tileEstValue'), fmt.money(d.value)],
              [t('deals.tileWinProb'),  d.probability+'%'],
            ] as [string, string][]).map(([l, v], i) => (
              <div key={i} style={{ flex:1, padding:'12px 13px', borderRadius:11, background:'var(--surface-muted)' }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize: i===0 ? 13 : 16, fontWeight:600, letterSpacing:'-0.02em', lineHeight:1.2 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Client reply */}
          <h3 style={{ fontSize:14, marginBottom:11 }}>
            {t('deals.sectionClientReply')}{' '}
            <span className="badge badge-neutral" style={{ marginLeft:6, height:19, fontSize:10.5 }}>{d.reply.kind}</span>
          </h3>
          <div style={{ padding:'13px 15px', borderRadius:'13px 13px 13px 4px', background:'var(--surface-muted)',
            marginBottom:12, fontSize:13.5, lineHeight:1.5, color:'var(--ink)' }}>
            &ldquo;{d.reply.message}&rdquo;
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginBottom:14 }}>
            <div style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)' }}>
              <div className="eyebrow" style={{ marginBottom:6 }}>
                {/* d.conf is the deal-level AI confidence score — a data value, not chrome */}
                {t('deals.sectionAiNotes')} · {d.conf}% confidence
              </div>
              <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.45 }}>{d.reply.interpretation}</p>
            </div>
            <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--primary-soft)' }}>
              <div className="eyebrow" style={{ color:'var(--primary)', marginBottom:6 }}>{t('deals.sectionSuggestedResp')}</div>
              <p style={{ fontSize:13, color:'var(--ink)', lineHeight:1.45 }}>&ldquo;{d.reply.suggested}&rdquo;</p>
            </div>
          </div>

          {/* Escalation panel */}
          {escalated && (
            <div style={{ padding:'13px 15px', borderRadius:12, background:'var(--warning-soft)', marginBottom:18 }}>
              <div className="row" style={{ gap:8, marginBottom:6 }}>
                <Icon name="alert" size={15} style={{color:'var(--warning)'}}/>
                <span style={{ fontSize:13, fontWeight:600 }}>{t('deals.sectionWhyNeeds')}</span>
              </div>
              <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.45, marginBottom:8 }}>{d.escReason}</p>
              <p style={{ fontSize:13, color:'var(--ink)', lineHeight:1.45 }}>
                <span style={{fontWeight:600}}>{t('deals.sectionAiRecommends')}</span>{d.aiRec}
              </p>
            </div>
          )}

          {/* Production timeline */}
          {d.production && (
            <div style={{ marginTop:6, paddingTop:18, borderTop:'1px solid var(--border)' }}>
              <h3 style={{ fontSize:14, marginBottom:14 }}>{t('deals.sectionProduction')}</h3>
              <ProductionTimeline p={d.production} />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="row wrap" style={{ gap:8, padding:'14px 20px', borderTop:'1px solid var(--border)', flex:'none' }}>
          {d.stage==='call' && <>
            {/* Schedule call: cosmetic only — no stage transition defined for this action */}
            <button disabled={pending} className="btn btn-primary grow" onClick={() => onAction('Founder call scheduled · '+d.client,'success')}>
              <Icon name="clock" size={15}/> {t('deals.btnScheduleCall')}
            </button>
            {/* Take over: cosmetic only — owner reassignment not modeled as a stage */}
            <button disabled={pending} className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={() => onAction('You took over · '+d.client)}>
              {t('deals.btnTakeOver')}
            </button>
          </>}
          {d.stage==='approval' && <>
            {/* Approve quote → quoted: human confirms the AI-drafted quote, moves to quoted state */}
            <button disabled={pending} className="btn btn-primary grow" onClick={() => changeStage('quoted', 'Quote approved · '+d.client)}>
              <Icon name="check" size={15}/> {t('deals.btnApproveQuote')}
            </button>
            {/* Reject → lost: human rejects the deal at approval stage */}
            <button disabled={pending} className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={() => changeStage('lost', 'Quote rejected · '+d.client)}>
              {t('deals.btnReject')}
            </button>
          </>}
          {d.stage==='pricing' && <>
            {/* Approve reply → quoted: human approves the AI reply so quote is sent */}
            <button disabled={pending} className="btn btn-primary grow" onClick={() => changeStage('quoted', 'Quote approved & sent · '+d.client)}>
              {t('deals.btnApproveReply')}
            </button>
            {/* Edit reply: cosmetic only — opens editing flow, no stage change yet */}
            <button disabled={pending} className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={() => onAction('Editing reply · '+d.client)}>
              {t('deals.btnEditReply')}
            </button>
          </>}
          {d.stage==='created' && <>
            {/* Send reply: cosmetic only — reply is sent but no defined enum transition from 'created' */}
            <button disabled={pending} className="btn btn-primary grow" onClick={() => onAction('Reply sent · '+d.client,'success')}>
              {t('deals.btnSendReply')}
            </button>
            {/* Follow up: cosmetic only — scheduling action, not a stage change */}
            <button disabled={pending} className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={() => onAction('Follow-up scheduled · '+d.client)}>
              {t('deals.btnFollowUp')}
            </button>
          </>}
          {d.stage==='won' && <>
            {/* Request assets: cosmetic only — reminder sent, deal remains 'won' */}
            <button disabled={pending} className="btn btn-primary grow" onClick={() => onAction('Content reminder sent · '+d.client,'success')}>
              {t('deals.btnRequestAssets')}
            </button>
            {/* Mark delivered: cosmetic only — delivery status not modeled as a separate stage enum value */}
            <button disabled={pending} className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={() => onAction('Marked delivered · '+d.client,'success')}>
              {t('deals.btnMarkDelivered')}
            </button>
          </>}
          <button disabled={pending} className="btn btn-soft" onClick={() => onAction('Summary requested · '+d.client)}>{t('deals.btnAskSummary')}</button>
        </div>
      </div>
    </>
  );
}

/* ---- DealsScreen ---- */

export interface DealsScreenProps {
  deals: Deal[];
  initialLead?: string | null;
}

export function DealsScreen({ deals, initialLead }: DealsScreenProps) {
  const { t } = useI18n();
  // onAction wired here so deals/page.tsx is a pure Server Component
  const onAction = useToast();
  const [q, setQ] = useState('');
  const [stage, setStage] = useState('All');
  // Pre-open deal whose leadId matches initialLead, if supplied
  const [open, setOpen] = useState<string | null>(() => {
    if (!initialLead) return null;
    return deals.find(d => d.leadId === initialLead)?.id ?? null;
  });

  const STAGES = [
    t('deals.fAll'),
    t('deals.fNeedsYou'),
    t('deals.fPricing'),
    t('deals.fCreated'),
    t('deals.fWon'),
  ];

  // Map translated chip labels back to English keys for data matching
  const EN_STAGE_MAP: Record<string, string> = {
    [t('deals.fAll')]:      'All',
    [t('deals.fNeedsYou')]: 'Needs you',
    [t('deals.fPricing')]:  'Pricing question',
    [t('deals.fCreated')]:  'Deal created',
    [t('deals.fWon')]:      'Won',
  };

  const matchS = (d: Deal): boolean => {
    const enStage = EN_STAGE_MAP[stage] ?? stage;
    if (enStage === 'All') return true;
    if (enStage === 'Needs you') return d.stage === 'call' || d.stage === 'approval';
    return DEAL_STAGE[d.stage].label === enStage;
  };

  const list = deals.filter(d => d.client.toLowerCase().includes(q.toLowerCase()) && matchS(d));
  const needYou = deals.filter(d => d.stage === 'call' || d.stage === 'approval').length;
  const weighted = Math.round(deals.reduce((s, d) => s + d.value * d.probability / 100, 0));
  const openDeal = open ? deals.find(d => d.id === open) : null;

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('deals.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('deals.sub')}</p>
        </div>
      </div>

      <OverviewBand items={[
        { label:t('deals.mOpen'),       value:deals.filter(d=>d.stage!=='lost').length, icon:'deals' },
        { label:t('deals.mApproval'),   value:needYou,  icon:'alert',    accent:'var(--warning)' },
        { label:t('deals.mWeighted'),   value:weighted, icon:'dollar',   accent:'var(--success)', prefix:'$' },
        { label:t('deals.mWonWeek'),    value:1,        icon:'check',    accent:'var(--success)' },
        { label:t('deals.mAvgProb'),    value:69,       icon:'activity', suffix:'%' },
        { label:t('deals.mProduction'), value:1,        icon:'bolt',     accent:'var(--primary)' },
      ]} />

      <div className="row wrap" style={{ gap:8, marginBottom:20 }}>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('deals.searchPlaceholder')}
            style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
        {STAGES.map(f => (
          <button key={f} className={'chip'+(stage===f?' active':'')} onClick={() => setStage(f)} style={{height:38}}>{f}</button>
        ))}
      </div>

      {list.length === 0
        ? <EmptyState icon="deals" title={t('deals.emptyTitle')} sub={t('deals.emptySub')} />
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(330px,1fr))', gap:16 }}>
            {list.map(d => <DealCard key={d.id} d={d} onOpen={id => setOpen(id)} />)}
          </div>
        )}

      {openDeal && <DealDrawer deal={openDeal} onClose={() => setOpen(null)} onAction={onAction} />}
    </div>
  );
}
