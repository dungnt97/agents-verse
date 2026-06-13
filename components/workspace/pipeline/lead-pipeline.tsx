/* =========================================================================
   AGENTS VERSE — Lead Pipeline (kanban, drag & drop)
   Ported verbatim from pipeline.jsx. Reads from WorkspaceStateProvider's
   mutable leads; stage placement persisted to localStorage.
   ========================================================================= */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/brand/icon';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { usePipelineAuditT } from '@/lib/i18n/keys/pipeline-audit';
import { AV } from '@/lib/data';
import type { Lead } from '@/lib/data/types';

/* ---- Stage metadata — colours match CSS custom properties exactly ---- */

interface StageMeta {
  labelKey: string;
  dot: string;
  tint: string;
}

const STAGE_META: Record<string, StageMeta> = {
  found:     { labelKey:'leads.stageFound',     dot:'var(--ink-3)',   tint:'var(--surface-muted)' },
  audited:   { labelKey:'leads.stageAudited',   dot:'var(--info)',    tint:'var(--info-soft)' },
  demo:      { labelKey:'leads.stageDemo',      dot:'var(--violet)',  tint:'var(--violet-soft)' },
  contacted: { labelKey:'leads.stageContacted', dot:'var(--primary)', tint:'var(--primary-soft)' },
  replied:   { labelKey:'leads.stageReplied',   dot:'var(--warning)', tint:'var(--warning-soft)' },
  won:       { labelKey:'leads.stageWon',       dot:'var(--success)', tint:'var(--success-soft)' },
  lost:      { labelKey:'leads.stageLost',      dot:'var(--danger)',  tint:'var(--danger-soft)' },
};

const BOARD: string[] = ['found','audited','demo','contacted','replied','won','lost'];

/* Next-action: `to` is the destination stage; `labelKey` is the i18n key for
   the button label. The EN label (verbatim) is kept in pipeline-audit.ts. */
const NEXT: Record<string, { to: string; labelKey: string } | undefined> = {
  found:     { to:'audited',   labelKey:'leads.actionRunAudit' },
  audited:   { to:'demo',      labelKey:'leads.actionGenerateDemo' },
  demo:      { to:'contacted', labelKey:'leads.actionPrepareOutreach' },
  contacted: { to:'replied',   labelKey:'leads.actionMarkReplied' },
  replied:   { to:'won',       labelKey:'leads.actionMarkWon' },
  won:       { to:'won',       labelKey:'leads.actionStartProduction' },
};

/* ---- LeadCard ---- */

interface LeadCardProps {
  lead: Lead;
  stage: string;
  onMove: (id: string, stage: string) => void;
  onAction: (msg: string, kind?: string) => void;
  onOpenAudit: (id: string) => void;
  onOpenDemo: (id: string) => void;
  dragging: boolean;
  dragProps: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: () => void;
  };
}

function LeadCard({ lead, stage, onMove, onAction, onOpenAudit, onOpenDemo, dragging, dragProps }: LeadCardProps) {
  const { t } = usePipelineAuditT();
  const next = NEXT[stage];
  const hue = AV.hueFor(lead.industry);
  return (
    <div {...dragProps} className="card" style={{ padding:13, cursor:'grab', userSelect:'none', opacity: dragging?0.4:1,
      boxShadow:'var(--sh-xs)', transition:'opacity .15s, box-shadow .15s, transform .15s' }}
      onMouseEnter={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='var(--sh-md)'}
      onMouseLeave={e=>(e.currentTarget as HTMLDivElement).style.boxShadow='var(--sh-xs)'}>
      <div className="row between" style={{ marginBottom:9 }}>
        <span className="row" style={{ gap:9, minWidth:0 }}>
          <span style={{ width:8, height:8, borderRadius:99, background:`oklch(0.62 0.14 ${hue})`, flex:'none' }} />
          <span style={{ fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.company}</span>
        </span>
        <span className="mono" style={{ fontSize:12, fontWeight:600, color:'var(--success)' }}>{AV.fmt.k(lead.value)}</span>
      </div>
      <div className="row" style={{ gap:6, marginBottom:11, fontSize:11.5, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden' }}>
        <span style={{flex:'none'}}>{lead.industry}</span>
        <span style={{width:3,height:3,borderRadius:99,background:'var(--border-strong)',flex:'none'}}/>
        <span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{lead.city}</span>
      </div>
      <div className="row" style={{ gap:8, marginBottom:11 }}>
        <span className="badge badge-neutral" style={{ height:20, fontSize:10.5 }} title="Current site score">Site {lead.site}</span>
        <span className="badge badge-primary" style={{ height:20, fontSize:10.5 }} title="Lead score">Lead {lead.score}</span>
      </div>
      <div className="row between" style={{ paddingTop:10, borderTop:'1px solid var(--border-soft)' }}>
        <span className="row" style={{ gap:7 }}>
          <AgentAvatar id={lead.agent} size={22} />
          <span style={{ fontSize:11.5, color:'var(--ink-3)' }}>{AV.agentById(lead.agent)?.name}</span>
        </span>
        {stage!=='lost' && next && (
          <button className="btn btn-soft btn-sm" style={{ height:26, fontSize:11.5, padding:'0 9px' }}
            onClick={()=>{ onMove(lead.id, next.to); onAction(t(next.labelKey)+' · '+lead.company, 'success'); }}>
            {t(next.labelKey)}
          </button>
        )}
      </div>
      {(['audited','demo','contacted','replied','won'].includes(stage)) && (
        <div className="row" style={{ gap:12, marginTop:9 }}>
          <button onClick={()=>onOpenAudit(lead.id)} style={{ fontSize:11.5, color:'var(--primary)', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}>{t('leads.cardAudit')}</button>
          {AV.demoByLead(lead.id) && (
            <button onClick={()=>onOpenDemo(lead.id)} style={{ fontSize:11.5, color:'var(--primary)', fontWeight:600, background:'none', border:'none', cursor:'pointer', padding:0 }}>{t('leads.cardDemo')}</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- LeadPipeline ---- */

export interface LeadPipelineProps {
  onAction: (msg: string, kind?: string) => void;
  onOpenAudit: (id: string) => void;
  onOpenDemo: (id: string) => void;
  leads?: Lead[];
}

export function LeadPipeline({ onAction, onOpenAudit, onOpenDemo, leads = AV.leads }: LeadPipelineProps) {
  const { t } = usePipelineAuditT();

  /* Stage placement — persisted to localStorage. Initialised from lead.stage,
     then overridden by any saved user moves. */
  const [place, setPlace] = useState<Record<string, string>>(() => {
    const base = Object.fromEntries(leads.map(l => [l.id, l.stage]));
    // Defer localStorage read to avoid SSR mismatch — starts from seed, merges after mount
    return base;
  });

  // Merge saved placements after mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('av-place') || '{}') as Record<string, string>;
      setPlace(p => ({ ...p, ...saved }));
    } catch { /* localStorage unavailable */ }
  }, []);

  // Persist every time place changes (after hydration)
  useEffect(() => {
    try { localStorage.setItem('av-place', JSON.stringify(place)); } catch { /* ignore */ }
  }, [place]);

  // EN sentinel values used for filter state comparison — always compared against
  // the EN key constant so filter logic is language-independent.
  const ALL_INDUSTRIES_EN = 'All industries';
  const ALL_AGENTS_EN = 'All agents';

  const [q, setQ] = useState('');
  const [ind, setInd] = useState(ALL_INDUSTRIES_EN);
  const [agentF, setAgentF] = useState(ALL_AGENTS_EN);
  const dragId = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  const move = (id: string, stage: string) => setPlace(p => ({ ...p, [id]: stage }));

  const industries = [ALL_INDUSTRIES_EN, ...Array.from(new Set(leads.map(l => l.industry)))];
  const agentNames = [ALL_AGENTS_EN, ...Array.from(new Set(leads.map(l => AV.agentById(l.agent)?.name).filter(Boolean) as string[]))];

  const visible = leads.filter(l =>
    (l.company + l.url).toLowerCase().includes(q.toLowerCase()) &&
    (ind === ALL_INDUSTRIES_EN || l.industry === ind) &&
    (agentF === ALL_AGENTS_EN || AV.agentById(l.agent)?.name === agentF)
  );

  const colLeads = (stage: string) => visible.filter(l => (place[l.id] || l.stage) === stage);
  const totalValue = visible.filter(l => (place[l.id] || l.stage) !== 'lost').reduce((s, l) => s + l.value, 0);

  return (
    <div style={{ padding:'26px 28px 30px', maxWidth:1480, margin:'0 auto', display:'flex', flexDirection:'column', minHeight:'calc(100vh - var(--shell-top))' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('leads.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('leads.sub')}</p>
        </div>
        <div className="row" style={{ gap:18 }}>
          <div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>{t('leads.openPipeline')}</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{AV.fmt.money(totalValue)}</div>
          </div>
          <div style={{ width:1, background:'var(--border)' }} />
          <div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)' }}>{t('leads.activeLeads')}</div>
            <div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{visible.filter(l => (place[l.id] || l.stage) !== 'lost').length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row wrap" style={{ gap:10, marginBottom:18 }}>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:240, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder={t('leads.searchPlaceholder')}
            style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
        {/* Industry filter — state held as EN sentinel; displayed label is translated */}
        <select value={ind} onChange={e=>setInd(e.target.value)} className="focusable"
          style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>
          <option value={ALL_INDUSTRIES_EN}>{t('leads.allIndustries')}</option>
          {industries.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {/* Agent filter — state held as EN sentinel; displayed label is translated */}
        <select value={agentF} onChange={e=>setAgentF(e.target.value)} className="focusable"
          style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>
          <option value={ALL_AGENTS_EN}>{t('leads.allAgents')}</option>
          {agentNames.slice(1).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Board */}
      <div className="scroll-x" style={{ display:'flex', gap:14, paddingBottom:14, flex:1, alignItems:'stretch' }}>
        {BOARD.map(stage => {
          const sm = STAGE_META[stage];
          const stageleads = colLeads(stage);
          const sum = stageleads.reduce((s, l) => s + l.value, 0);
          return (
            <div key={stage}
              onDragOver={e => { e.preventDefault(); if (over !== stage) setOver(stage); }}
              onDragLeave={() => setOver(o => o === stage ? null : o)}
              onDrop={e => { e.preventDefault(); if (dragId.current) move(dragId.current, stage); setOver(null); setDragging(null); }}
              style={{ width:268, flex:'none', display:'flex', flexDirection:'column', borderRadius:14,
                background: over===stage ? sm.tint : 'var(--surface-muted)',
                border: `1px solid ${over===stage ? sm.dot : 'var(--border)'}`,
                transition:'background .15s, border-color .15s' }}>
              <div className="row between" style={{ padding:'12px 14px' }}>
                <span className="row" style={{ gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:99, background:sm.dot }} />
                  <span style={{ fontSize:13, fontWeight:600 }}>{t(sm.labelKey)}</span>
                  <span className="mono" style={{ fontSize:11.5, color:'var(--ink-3)' }}>{stageleads.length}</span>
                </span>
                {sum > 0 && <span className="mono" style={{ fontSize:11, color:'var(--ink-3)' }}>{AV.fmt.k(sum)}</span>}
              </div>
              <div style={{ padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:10, flex:1, overflowY:'auto', minHeight:90 }}>
                {stageleads.length === 0 && (
                  <div className="col center" style={{ flex:1, minHeight:80, border:'1.5px dashed var(--border-strong)', borderRadius:11, color:'var(--ink-4)', fontSize:12 }}>
                    {t('leads.dropHere')}
                  </div>
                )}
                {stageleads.map(l => (
                  <LeadCard key={l.id} lead={l} stage={stage} onMove={move} onAction={onAction}
                    onOpenAudit={onOpenAudit} onOpenDemo={onOpenDemo}
                    dragging={dragging === l.id}
                    dragProps={{
                      draggable: true,
                      onDragStart: (e) => { dragId.current = l.id; setDragging(l.id); e.dataTransfer.effectAllowed = 'move'; },
                      onDragEnd: () => { setDragging(null); setOver(null); },
                    }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
