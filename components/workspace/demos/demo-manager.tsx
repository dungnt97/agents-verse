/* =========================================================================
   AGENTS VERSE — Demo Preview Manager (grid + before/after detail drawer)
   Ported verbatim from demos.jsx. Receives demos via props (server-fetched from the
   repository layer); opens drawer for before/after comparison, checklist, and
   tone-selectable outreach.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { CountUp } from '@/components/ui/count-up';
import { AgentAvatar, AvatarStack } from '@/components/ui/agent-avatar';
import { SiteMock, NewSite } from '@/components/site-mock';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { fmt, hueFor } from '@/lib/data/format';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { useToast } from '@/lib/providers/toast-provider';
import type { Demo } from '@/lib/data/types';

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

/* ---- EmptyState (local — matches rooms.jsx:127 verbatim) ---- */

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

/* ---- DemoThumb ---- */

function DemoThumb({ hue, label }: { hue: number; label?: string }) {
  return (
    <div style={{ position:'relative', paddingTop:'58%', borderBottom:'1px solid var(--border)' }}>
      <div style={{ position:'absolute', inset:0 }}><NewSite hue={hue} /></div>
      {label && (
        <span className="mono" style={{ position:'absolute', left:10, bottom:9, fontSize:10, color:'#fff',
          background:'rgba(0,0,0,.45)', padding:'2px 7px', borderRadius:6, backdropFilter:'blur(4px)' }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ---- DemoCard ---- */

function DemoCard({ d, onOpen }: { d: Demo; onOpen: (id: string) => void; onAction: (msg: string, kind?: string) => void }) {
  const [hover, setHover] = useState(false);
  const hue = hueFor(d.industry);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => onOpen(d.id)}
      className="card" style={{ padding:0, overflow:'hidden', cursor:'pointer', transition:'transform .2s, box-shadow .2s, border-color .2s',
        transform: hover ? 'translateY(-3px)' : 'none',
        boxShadow: hover ? 'var(--sh-lg)' : 'var(--sh-sm)',
        borderColor: hover ? 'var(--border-strong)' : 'var(--border)' }}>
      <div style={{ position:'relative' }}>
        <DemoThumb hue={hue} label={d.demoUrl} />
        <span className={'badge '+d.statusCls} style={{ position:'absolute', top:10, right:10, boxShadow:'var(--sh-sm)' }}>
          {d.statusLabel}
        </span>
      </div>
      <div style={{ padding:'14px 15px' }}>
        <div className="row between" style={{ marginBottom:5 }}>
          <span style={{ fontSize:14.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.business}</span>
          <span className="mono" style={{ fontSize:12.5, fontWeight:600, color:'var(--success)' }}>{fmt.k(d.value)}</span>
        </div>
        <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:12 }}>{d.industry} · {d.city}</div>
        <div className="row between">
          <div className="row" style={{ gap:9 }}>
            <span className="mono" style={{ fontSize:12, color:'var(--danger)' }}>{d.oldScore}</span>
            <Icon name="arrowR" size={13} style={{ color:'var(--ink-4)' }} />
            <span className="mono" style={{ fontSize:12, color:'var(--success)', fontWeight:600 }}>{d.newScore}</span>
          </div>
          <span className="row" style={{ gap:8 }}>
            <AvatarStack ids={d.agents} size={22} max={3} />
            <span style={{ fontSize:11, color:'var(--ink-3)' }}>{d.generated}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---- DemoDrawer ---- */

function DemoDrawer({ demo, onClose, onAction }: { demo: Demo; onClose: () => void; onAction: (msg: string, kind?: string) => void }) {
  const { t } = useI18n();
  const { agentById } = useWorkspaceData();
  const d = demo;
  const hue = hueFor(d.industry);
  const first = d.business.split(' ')[0];

  /* Outreach tone variants — body text for each tone */
  const tones: Record<string, string> = {
    [t('demos.toneFriendly')]: d.outreach.body,
    [t('demos.tonePremium')]:  `Hi ${first} team — we took the liberty of rebuilding your homepage as a working concept. It's fast, refined and built to convert. No charge, no obligation — we'd genuinely value your eye on it.`,
    [t('demos.toneDirect')]:   `Hi ${first} team — we rebuilt your homepage. It loads faster, works on mobile, and drives more enquiries. Live demo inside. Worth two minutes?`,
    [t('demos.toneLocal')]:    `Hi ${first} team — we're local and we rebuilt your ${d.city} homepage as a free working demo. Mobile-ready and easy for your customers. Mind taking a look?`,
  };

  const [tone, setTone] = useState(t('demos.toneFriendly'));
  const [body, setBody] = useState(tones[t('demos.toneFriendly')]);

  const pickTone = (tk: string) => { setTone(tk); setBody(tones[tk]); };
  const checks = Object.entries(d.checklist);
  const passed = checks.filter(([, v]) => v).length;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(20,18,12,.4)', backdropFilter:'blur(2px)', animation:'fade-in .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:680, maxWidth:'96vw', zIndex:121, background:'var(--surface)',
        borderLeft:'1px solid var(--border)', boxShadow:'var(--sh-xl)', display:'flex', flexDirection:'column',
        animation:'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>

        {/* Header */}
        <div className="row between" style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flex:'none' }}>
          <div className="row" style={{ gap:12 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:600 }}>{d.business}</div>
              <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>{d.industry} · {d.city}</div>
            </div>
            <span className={'badge '+d.statusCls}>{d.statusLabel}</span>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor:'var(--border)' }}>
            <Icon name="x" size={17} />
          </button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {/* Before / after */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:10 }}>
            <div>
              <div className="row between" style={{ marginBottom:8 }}>
                <span className="eyebrow" style={{color:'var(--ink-3)'}}>{t('demos.sectionBefore')}</span>
                <span className="badge badge-danger" style={{height:20}}>{d.oldScore}</span>
              </div>
              <SiteMock variant="old" hue={hue} chrome={false} ratio="64%" />
            </div>
            <div>
              <div className="row between" style={{ marginBottom:8 }}>
                <span className="eyebrow" style={{color:'var(--primary)'}}>{t('demos.sectionAfter')}</span>
                <span className="badge badge-success" style={{height:20}}>{d.newScore}</span>
              </div>
              <SiteMock variant="new" hue={hue} chrome={false} ratio="64%" />
            </div>
          </div>
          <div className="row between" style={{ padding:'10px 14px', borderRadius:11, background:'var(--success-soft)', marginBottom:20 }}>
            <span className="row" style={{ gap:8, fontSize:13, color:'var(--ink)', fontWeight:600 }}>
              <Icon name="arrowUR" size={15} style={{color:'var(--success)'}}/> +{d.newScore-d.oldScore} {t('demos.liftSuffix')}
            </span>
            <button className="btn btn-soft btn-sm" onClick={() => onAction('Opened live demo · '+d.business)}>
              {t('demos.btnOpenDemo')} <Icon name="external" size={13}/>
            </button>
          </div>

          {/* Key changes + checklist */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:14, marginBottom:12 }}>{t('demos.sectionKeyChanges')}</h3>
              <div className="col" style={{ gap:9 }}>
                {d.changes.map((c, i) => (
                  <div key={i} className="row" style={{ gap:10, alignItems:'flex-start' }}>
                    <Icon name="check" size={15} sw={2.2} style={{ color:'var(--primary)', flex:'none', marginTop:1 }}/>
                    <span style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.4 }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="row between" style={{ marginBottom:12 }}>
                <h3 style={{ fontSize:14 }}>{t('demos.sectionChecklist')}</h3>
                <span className="mono" style={{ fontSize:11.5, color: passed===checks.length ? 'var(--success)' : 'var(--warning)' }}>
                  {passed}/{checks.length}
                </span>
              </div>
              <div className="col" style={{ gap:8 }}>
                {checks.map(([k, v], i) => (
                  <div key={i} className="row" style={{ gap:10 }}>
                    <span style={{ width:18, height:18, borderRadius:6, display:'grid', placeItems:'center', flex:'none',
                      background: v ? 'var(--success)' : 'var(--surface-muted)',
                      color: v ? '#fff' : 'var(--ink-3)',
                      border: v ? 'none' : '1px solid var(--border)' }}>
                      {v ? <Icon name="check" size={12} sw={2.6}/> : <Icon name="x" size={11}/>}
                    </span>
                    <span style={{ fontSize:13, color: v ? 'var(--ink-2)' : 'var(--ink-3)' }}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent notes */}
          <div style={{ padding:'13px 15px', borderRadius:12, background:'var(--surface-muted)', marginBottom:20 }}>
            <div className="row" style={{ gap:8, marginBottom:7 }}>
              <AgentAvatar id={d.agents[0]} size={22}/>
              <span style={{ fontSize:12.5, fontWeight:600 }}>{agentById(d.agents[0])?.name}&apos;s notes</span>
            </div>
            <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.5 }}>{d.notes}</p>
          </div>

          {/* Outreach */}
          <h3 style={{ fontSize:14, marginBottom:12 }}>{t('demos.sectionOutreach')}</h3>
          <div className="row" style={{ gap:7, marginBottom:12, flexWrap:'wrap' }}>
            {Object.keys(tones).map(tk => (
              <button key={tk} className={'chip'+(tone===tk?' active':'')} onClick={() => pickTone(tk)} style={{ height:30 }}>{tk}</button>
            ))}
          </div>
          <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-soft)', fontSize:13 }}>
              <span style={{ color:'var(--ink-3)' }}>{t('demos.subjectLabel')}</span>
              <span style={{ fontWeight:600 }}>{d.outreach.subject}</span>
            </div>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4}
              style={{ width:'100%', border:'none', outline:'none', resize:'vertical', padding:'12px 14px', fontSize:13.5,
                lineHeight:1.5, color:'var(--ink)', background:'transparent', fontFamily:'var(--font-sans)' }} />
            <div className="row" style={{ gap:8, padding:'10px 14px', borderTop:'1px solid var(--border-soft)', background:'var(--surface-muted)' }}>
              <span className="row" style={{ gap:6, fontSize:11.5, color:'var(--ink-3)' }}>
                <Icon name="globe" size={13}/> {d.demoUrl}
              </span>
              <span className="row" style={{ gap:6, fontSize:11.5, color:'var(--success)', marginLeft:'auto' }}>
                <Icon name="shield" size={13}/> {t('demos.guardrail')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="row" style={{ gap:10, padding:'14px 20px', borderTop:'1px solid var(--border)', flex:'none', flexWrap:'wrap' }}>
          {d.status==='review'   && <button className="btn btn-primary grow" onClick={() => onAction('Demo approved · '+d.business,'success')}><Icon name="check" size={16}/> {t('demos.btnApprove')}</button>}
          {d.status==='approved' && <button className="btn btn-primary grow" onClick={() => onAction('Outreach prepared · '+d.business,'success')}><Icon name="send" size={15}/> {t('demos.btnPrepareOutreach')}</button>}
          {(d.status==='sent'||d.status==='replied') && <button className="btn btn-primary grow" onClick={() => onAction('Reply handling opened · '+d.business)}>{t('demos.btnHandleReply')}</button>}
          {d.status==='won'      && <button className="btn btn-primary grow" onClick={() => onAction('Production started · '+d.business,'success')}>{t('demos.btnStartProduction')}</button>}
          {d.status==='draft'    && <button className="btn btn-primary grow" onClick={() => onAction('Sent for review · '+d.business,'success')}>{t('demos.btnSendReview')}</button>}
          <button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={() => onAction('Improvement requested')}>
            <Icon name="spark" size={15}/> {t('demos.btnImproveAI')}
          </button>
          <button className="btn btn-soft" onClick={() => onAction('Demo link copied','success')}>{t('demos.btnCopyLink')}</button>
        </div>
      </div>
    </>
  );
}

/* ---- DemoManager ---- */

export interface DemoManagerProps {
  demos: Demo[];
  initialLead?: string | null;
}

export function DemoManager({ demos, initialLead }: DemoManagerProps) {
  const { t } = useI18n();
  // onAction wired here so demos/page.tsx is a pure Server Component
  const onAction = useToast();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [ind, setInd] = useState('All industries');
  // Open the demo whose leadId matches initialLead, if supplied
  const [open, setOpen] = useState<string | null>(() => {
    if (!initialLead) return null;
    return demos.find(d => d.leadId === initialLead)?.id ?? null;
  });

  const STAT = [
    t('demos.fAll'),
    t('demos.fNeedsReview'),
    t('demos.fApproved'),
    t('demos.fSent'),
    t('demos.fReplied'),
    t('demos.fWon'),
  ];

  // Status matching uses English status labels from data (d.statusLabel is data, not chrome)
  const EN_STAT_MAP: Record<string, string> = {
    [t('demos.fAll')]:         'All',
    [t('demos.fNeedsReview')]: 'Needs review',
    [t('demos.fApproved')]:    'Approved',
    [t('demos.fSent')]:        'Sent',
    [t('demos.fReplied')]:     'Client replied',
    [t('demos.fWon')]:         'Won',
  };

  const matchStat = (d: Demo) => {
    const enStatus = EN_STAT_MAP[status] ?? status;
    return enStatus === 'All' || d.statusLabel === enStatus;
  };

  const allIndustriesLabel = 'All industries';
  const industryList = [allIndustriesLabel, ...Array.from(new Set(demos.map(d => d.industry)))];

  const list = demos.filter(d =>
    d.business.toLowerCase().includes(q.toLowerCase()) &&
    matchStat(d) &&
    (ind === allIndustriesLabel || d.industry === ind)
  );

  const counts = {
    total:  demos.length,
    review: demos.filter(d => d.status==='review').length,
    sent:   demos.filter(d => ['sent','replied'].includes(d.status)).length,
    won:    demos.filter(d => d.status==='won').length,
  };

  const openDemo = open ? demos.find(d => d.id === open) : null;

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('demos.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('demos.sub')}</p>
        </div>
      </div>

      <OverviewBand items={[
        { label:t('demos.mTotal'),    value:counts.total,  icon:'layers' },
        { label:t('demos.mReview'),   value:counts.review, icon:'alert',  accent:'var(--warning)' },
        { label:t('demos.mSent'),     value:counts.sent,   icon:'send',   accent:'var(--info)' },
        { label:t('demos.mWon'),      value:counts.won,    icon:'deals',  accent:'var(--success)' },
        { label:t('demos.mAvgLift'),  value:51, suffix:' pts', icon:'arrowUR', accent:'var(--success)' },
        { label:t('demos.mPipeline'), value:23.7, prefix:'$', suffix:'k', icon:'dollar' },
      ]} />

      <div className="row wrap" style={{ gap:10, marginBottom:20 }}>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('demos.searchPlaceholder')}
            style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
        <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
          {STAT.map(f => (
            <button key={f} className={'chip'+(status===f?' active':'')} onClick={() => setStatus(f)} style={{height:38}}>{f}</button>
          ))}
        </div>
        <select value={ind} onChange={e => setInd(e.target.value)} className="focusable"
          style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500, marginLeft:'auto' }}>
          {industryList.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      {list.length === 0
        ? <EmptyState icon="layers" title={t('demos.emptyTitle')} sub={t('demos.emptySub')} />
        : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
            {list.map(d => <DemoCard key={d.id} d={d} onOpen={id => setOpen(id)} onAction={onAction} />)}
          </div>
        )}

      {openDemo && <DemoDrawer demo={openDemo} onClose={() => setOpen(null)} onAction={onAction} />}
    </div>
  );
}
