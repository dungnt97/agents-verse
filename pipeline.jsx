/* =========================================================================
   AGENTS VERSE — Lead Pipeline (kanban, drag & drop)
   ========================================================================= */

const STAGE_META = {
  found:     { label:'Found',          dot:'var(--ink-3)',  tint:'var(--surface-muted)' },
  audited:   { label:'Audited',        dot:'var(--info)',   tint:'var(--info-soft)' },
  demo:      { label:'Demo',           dot:'var(--violet)', tint:'var(--violet-soft)' },
  contacted: { label:'Contacted',      dot:'var(--primary)',tint:'var(--primary-soft)' },
  replied:   { label:'Replied',        dot:'var(--warning)',tint:'var(--warning-soft)' },
  won:       { label:'Won',            dot:'var(--success)',tint:'var(--success-soft)' },
  lost:      { label:'Lost',           dot:'var(--danger)', tint:'var(--danger-soft)' },
};
const BOARD = ['found','audited','demo','contacted','replied','won','lost'];
const NEXT = { found:{to:'audited',label:'Run audit'}, audited:{to:'demo',label:'Generate demo'}, demo:{to:'contacted',label:'Prepare outreach'}, contacted:{to:'replied',label:'Mark replied'}, replied:{to:'won',label:'Mark won'}, won:{to:'won',label:'Start production'} };

function LeadCard({ lead, stage, onMove, onAction, onOpenAudit, onOpenDemo, dragProps, dragging }) {
  const next = NEXT[stage];
  const hue = AV.hueFor(lead.industry);
  return (
    <div {...dragProps} className="card" style={{ padding:13, cursor:'grab', userSelect:'none', opacity: dragging?0.4:1,
      boxShadow:'var(--sh-xs)', transition:'opacity .15s, box-shadow .15s, transform .15s' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--sh-md)'} onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--sh-xs)'}>
      <div className="row between" style={{ marginBottom:9 }}>
        <span className="row" style={{ gap:9, minWidth:0 }}>
          <span style={{ width:8, height:8, borderRadius:99, background:`oklch(0.62 0.14 ${hue})`, flex:'none' }} />
          <span style={{ fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.company}</span>
        </span>
        <span className="mono" style={{ fontSize:12, fontWeight:600, color:'var(--success)' }}>{AV.fmt.k(lead.value)}</span>
      </div>
      <div className="row" style={{ gap:6, marginBottom:11, fontSize:11.5, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden' }}>
        <span style={{flex:'none'}}>{lead.industry}</span><span style={{width:3,height:3,borderRadius:99,background:'var(--border-strong)',flex:'none'}}/><span style={{overflow:'hidden',textOverflow:'ellipsis'}}>{lead.city}</span>
      </div>
      <div className="row" style={{ gap:8, marginBottom:11 }}>
        <span className="badge badge-neutral" style={{ height:20, fontSize:10.5 }} title="Current site score">Site {lead.site}</span>
        <span className="badge badge-primary" style={{ height:20, fontSize:10.5 }} title="Lead score">Lead {lead.score}</span>
      </div>
      <div className="row between" style={{ paddingTop:10, borderTop:'1px solid var(--border-soft)' }}>
        <span className="row" style={{ gap:7 }}><AgentAvatar id={lead.agent} size={22} /><span style={{ fontSize:11.5, color:'var(--ink-3)' }}>{AV.agentById(lead.agent)?.name}</span></span>
        {stage!=='lost' && next && <button className="btn btn-soft btn-sm" style={{ height:26, fontSize:11.5, padding:'0 9px' }}
          onClick={()=>{ onMove(lead.id, next.to); onAction(next.label+' · '+lead.company, 'success'); }}>{next.label}</button>}
      </div>
      {(['audited','demo','contacted','replied','won'].includes(stage)) && (
        <div className="row" style={{ gap:12, marginTop:9 }}>
          <button onClick={()=>onOpenAudit(lead.id)} style={{ fontSize:11.5, color:'var(--primary)', fontWeight:600 }}>Audit</button>
          {AV.demoByLead(lead.id) && <button onClick={()=>onOpenDemo(lead.id)} style={{ fontSize:11.5, color:'var(--primary)', fontWeight:600 }}>Demo</button>}
        </div>
      )}
    </div>
  );
}

function LeadPipeline({ onAction, onOpenAudit, onOpenDemo, leads = AV.leads }) {
  const [place, setPlace] = useState(() => { let saved={}; try{ saved=JSON.parse(localStorage.getItem('av-place')||'{}'); }catch(e){} return { ...Object.fromEntries(leads.map(l => [l.id, l.stage])), ...saved }; });
  useEffect(()=>{ localStorage.setItem('av-place', JSON.stringify(place)); }, [place]);
  const [q, setQ] = useState('');
  const [ind, setInd] = useState('All industries');
  const [agentF, setAgentF] = useState('All agents');
  const dragId = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);

  const move = (id, stage) => setPlace(p => ({ ...p, [id]: stage }));
  const industries = ['All industries', ...Array.from(new Set(leads.map(l=>l.industry)))];
  const agentNames = ['All agents', ...Array.from(new Set(leads.map(l=>AV.agentById(l.agent)?.name)))];

  const visible = leads.filter(l =>
    (l.company+l.url).toLowerCase().includes(q.toLowerCase()) &&
    (ind==='All industries'||l.industry===ind) &&
    (agentF==='All agents'||AV.agentById(l.agent)?.name===agentF)
  );
  const colLeads = (stage) => visible.filter(l => (place[l.id]||l.stage)===stage);
  const totalValue = visible.filter(l=>(place[l.id]||l.stage)!=='lost').reduce((s,l)=>s+l.value,0);

  return (
    <div style={{ padding:'26px 28px 30px', maxWidth:1480, margin:'0 auto', display:'flex', flexDirection:'column', minHeight:'calc(100vh - var(--shell-top))' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:18 }}>
        <div>
          <h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('leads.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('leads.sub')}</p>
        </div>
        <div className="row" style={{ gap:18 }}>
          <div><div style={{ fontSize:11.5, color:'var(--ink-3)' }}>Open pipeline</div><div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{AV.fmt.money(totalValue)}</div></div>
          <div style={{ width:1, background:'var(--border)' }} />
          <div><div style={{ fontSize:11.5, color:'var(--ink-3)' }}>Active leads</div><div style={{ fontSize:22, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{visible.filter(l=>(place[l.id]||l.stage)!=='lost').length}</div></div>
        </div>
      </div>
      {/* filters */}
      <div className="row wrap" style={{ gap:10, marginBottom:18 }}>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:240, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search company or URL…" style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
        {[[ind,setInd,industries],[agentF,setAgentF,agentNames]].map(([v,set,opts],i)=>(
          <select key={i} value={v} onChange={e=>set(e.target.value)} className="focusable" style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>
            {opts.map(o=><option key={o}>{o}</option>)}
          </select>
        ))}
      </div>
      {/* board */}
      <div className="scroll-x" style={{ display:'flex', gap:14, paddingBottom:14, flex:1, alignItems:'stretch' }}>
        {BOARD.map(stage => {
          const sm = STAGE_META[stage];
          const leads = colLeads(stage);
          const sum = leads.reduce((s,l)=>s+l.value,0);
          return (
            <div key={stage} onDragOver={e=>{e.preventDefault(); if(over!==stage)setOver(stage);}} onDragLeave={()=>setOver(o=>o===stage?null:o)}
              onDrop={e=>{e.preventDefault(); if(dragId.current) move(dragId.current, stage); setOver(null); setDragging(null);}}
              style={{ width:268, flex:'none', display:'flex', flexDirection:'column', borderRadius:14,
                background: over===stage?sm.tint:'var(--surface-muted)', border:`1px solid ${over===stage?sm.dot:'var(--border)'}`, transition:'background .15s, border-color .15s' }}>
              <div className="row between" style={{ padding:'12px 14px' }}>
                <span className="row" style={{ gap:8 }}><span style={{ width:8, height:8, borderRadius:99, background:sm.dot }} /><span style={{ fontSize:13, fontWeight:600 }}>{sm.label}</span><span className="mono" style={{ fontSize:11.5, color:'var(--ink-3)' }}>{leads.length}</span></span>
                {sum>0 && <span className="mono" style={{ fontSize:11, color:'var(--ink-3)' }}>{AV.fmt.k(sum)}</span>}
              </div>
              <div style={{ padding:'0 10px 10px', display:'flex', flexDirection:'column', gap:10, flex:1, overflowY:'auto', minHeight:90 }}>
                {leads.length===0 && <div className="col center" style={{ flex:1, minHeight:80, border:'1.5px dashed var(--border-strong)', borderRadius:11, color:'var(--ink-4)', fontSize:12 }}>Drop here</div>}
                {leads.map(l => (
                  <LeadCard key={l.id} lead={l} stage={stage} onMove={move} onAction={onAction} onOpenAudit={onOpenAudit} onOpenDemo={onOpenDemo}
                    dragging={dragging===l.id}
                    dragProps={{ draggable:true,
                      onDragStart:(e)=>{ dragId.current=l.id; setDragging(l.id); e.dataTransfer.effectAllowed='move'; },
                      onDragEnd:()=>{ setDragging(null); setOver(null); } }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { LeadPipeline, STAGE_META, BOARD });
