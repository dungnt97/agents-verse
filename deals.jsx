/* =========================================================================
   AGENTS VERSE — Deals (approval flow · reply handling · production)
   ========================================================================= */

function ProbBar({ value }) {
  const col = value>=80?'var(--success)':value>=55?'var(--primary)':'var(--warning)';
  return (
    <div className="row" style={{ gap:9 }}>
      <div className="track" style={{ width:64, height:6 }}><i style={{ width:value+'%', background:col }} /></div>
      <span className="mono" style={{ fontSize:12, color:'var(--ink-2)' }}>{value}%</span>
    </div>
  );
}

function DealCard({ d, onOpen, onAction }) {
  const [hover,setHover]=useState(false);
  const st = AV.DEAL_STAGE[d.stage];
  const escalated = d.stage==='call' || d.stage==='approval';
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onOpen(d.id)}
      className="card" style={{ padding:'15px 17px', cursor:'pointer', transition:'transform .18s, box-shadow .18s, border-color .18s',
        transform:hover?'translateY(-2px)':'none', boxShadow:hover?'var(--sh-md)':'var(--sh-sm)', borderColor: escalated?'color-mix(in oklab,var(--warning) 40%, var(--border))':(hover?'var(--border-strong)':'var(--border)') }}>
      <div className="row between" style={{ marginBottom:11 }}>
        <span className="row" style={{ gap:11, minWidth:0 }}>
          <span style={{ width:36, height:36, borderRadius:10, background:`oklch(0.62 0.13 ${AV.hueFor(d.industry)} / .16)`, display:'grid', placeItems:'center', flex:'none' }}>
            <span style={{ width:9, height:9, borderRadius:99, background:`oklch(0.6 0.15 ${AV.hueFor(d.industry)})` }} /></span>
          <span style={{ minWidth:0 }}>
            <div style={{ fontSize:15, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.client}</div>
            <div style={{ fontSize:12, color:'var(--ink-3)' }}>{d.pkg} · {d.city}</div>
          </span>
        </span>
        <span className={'badge '+st.cls}>{st.label}</span>
      </div>
      <div className="row between" style={{ alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11.5, color:'var(--ink-3)', marginBottom:2 }}>Quoted · est. value</div>
          <div className="row" style={{ gap:8, alignItems:'baseline' }}>
            <span style={{ fontSize:19, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{AV.fmt.money(d.price)}</span>
            <span style={{ fontSize:12.5, color:'var(--ink-3)' }} className="tabular">/ {AV.fmt.money(d.value)}</span>
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

function ProductionTimeline({ p }) {
  return (
    <div>
      <div className="row between" style={{ marginBottom:14 }}>
        <span className="row" style={{ gap:8 }}><span className="pulse" style={{background:'var(--primary)'}}/><span style={{ fontSize:13.5, fontWeight:600 }}>{p.phase}</span></span>
        <span style={{ fontSize:12, color:'var(--ink-3)' }}>{p.target}</span>
      </div>
      <div className="scroll-x" style={{ display:'flex', gap:0, marginBottom:16 }}>
        {p.stages.map((s,i)=>(
          <div key={i} className="row" style={{ gap:0, flex:'none' }}>
            <div className="col center" style={{ gap:6, width:78 }}>
              <span style={{ width:24, height:24, borderRadius:99, display:'grid', placeItems:'center', flex:'none',
                background: s.done?'var(--success)':s.current?'var(--primary)':'var(--surface-muted)',
                color: (s.done||s.current)?'#fff':'var(--ink-3)', border: s.done||s.current?'none':'1px solid var(--border)' }}>
                {s.done?<Icon name="check" size={13} sw={2.6}/>:s.current?<span style={{width:7,height:7,borderRadius:99,background:'#fff'}}/>:<span style={{fontSize:10}}>{i+1}</span>}</span>
              <span style={{ fontSize:10, textAlign:'center', lineHeight:1.2, color: s.current?'var(--ink)':'var(--ink-3)', fontWeight:s.current?600:400 }}>{s.name}</span>
            </div>
            {i<p.stages.length-1 && <span style={{ width:14, height:2, background: s.done?'var(--success)':'var(--border)', marginTop:11, flex:'none' }} />}
          </div>
        ))}
      </div>
      {p.blocker && <div className="row" style={{ gap:9, padding:'10px 13px', borderRadius:10, background:'var(--warning-soft)', marginBottom:14 }}><Icon name="alert" size={15} style={{color:'var(--warning)'}}/><span style={{ fontSize:13, color:'var(--ink)' }}>{p.blocker}</span></div>}
      <div className="eyebrow" style={{ marginBottom:10 }}>Required client assets</div>
      <div className="col" style={{ gap:8 }}>
        {p.assets.map((a,i)=>(<div key={i} className="row between"><span className="row" style={{ gap:10 }}><span style={{ width:18, height:18, borderRadius:6, display:'grid', placeItems:'center', flex:'none', background:a.got?'var(--success)':'var(--surface-muted)', color:a.got?'#fff':'var(--ink-3)', border:a.got?'none':'1px solid var(--border)' }}>{a.got?<Icon name="check" size={12} sw={2.6}/>:<Icon name="clock" size={11}/>}</span><span style={{ fontSize:13, color:a.got?'var(--ink-2)':'var(--ink)' }}>{a.name}</span></span><span style={{ fontSize:11.5, color:a.got?'var(--success)':'var(--warning)', fontWeight:600 }}>{a.got?'Received':'Pending'}</span></div>))}
      </div>
    </div>
  );
}

function DealDrawer({ deal, onClose, onAction }) {
  const d = deal;
  const st = AV.DEAL_STAGE[d.stage];
  const escalated = d.stage==='call' || d.stage==='approval';
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(20,18,12,.4)', backdropFilter:'blur(2px)', animation:'fade-in .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:560, maxWidth:'95vw', zIndex:121, background:'var(--surface)', borderLeft:'1px solid var(--border)', boxShadow:'var(--sh-xl)', display:'flex', flexDirection:'column', animation:'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flex:'none' }}>
          <div><div className="row" style={{gap:10}}><div style={{ fontSize:16.5, fontWeight:600 }}>{d.client}</div><span className={'badge '+st.cls}>{st.label}</span></div><div style={{ fontSize:12.5, color:'var(--ink-3)', marginTop:3 }}>{d.industry} · {d.city}</div></div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor:'var(--border)' }}><Icon name="x" size={17} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {/* quote summary */}
          <div className="row" style={{ gap:12, marginBottom:20 }}>
            {[['Package',d.pkg],['Quoted',AV.fmt.money(d.price)],['Est. value',AV.fmt.money(d.value)],['Win prob.',d.probability+'%']].map(([l,v],i)=>(
              <div key={i} style={{ flex:1, padding:'12px 13px', borderRadius:11, background:'var(--surface-muted)' }}>
                <div style={{ fontSize:11, color:'var(--ink-3)', marginBottom:4 }}>{l}</div>
                <div style={{ fontSize:i===0?13:16, fontWeight:600, letterSpacing:'-0.02em', lineHeight:1.2 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* client reply */}
          <h3 style={{ fontSize:14, marginBottom:11 }}>Client reply <span className="badge badge-neutral" style={{ marginLeft:6, height:19, fontSize:10.5 }}>{d.reply.kind}</span></h3>
          <div style={{ padding:'13px 15px', borderRadius:'13px 13px 13px 4px', background:'var(--surface-muted)', marginBottom:12, fontSize:13.5, lineHeight:1.5, color:'var(--ink)' }}>“{d.reply.message}”</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginBottom:14 }}>
            <div style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)' }}>
              <div className="eyebrow" style={{ marginBottom:6 }}>AI interpretation · {d.reply.confidence||d.conf}% confidence</div>
              <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.45 }}>{d.reply.interpretation}</p>
            </div>
            <div style={{ padding:'12px 14px', borderRadius:12, background:'var(--primary-soft)' }}>
              <div className="eyebrow" style={{ color:'var(--primary)', marginBottom:6 }}>Suggested response</div>
              <p style={{ fontSize:13, color:'var(--ink)', lineHeight:1.45 }}>“{d.reply.suggested}”</p>
            </div>
          </div>

          {/* escalation */}
          {escalated && (
            <div style={{ padding:'13px 15px', borderRadius:12, background:'var(--warning-soft)', marginBottom:18 }}>
              <div className="row" style={{ gap:8, marginBottom:6 }}><Icon name="alert" size={15} style={{color:'var(--warning)'}}/><span style={{ fontSize:13, fontWeight:600 }}>Why this needs you</span></div>
              <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.45, marginBottom:8 }}>{d.escReason}</p>
              <p style={{ fontSize:13, color:'var(--ink)', lineHeight:1.45 }}><span style={{fontWeight:600}}>AI recommends: </span>{d.aiRec}</p>
            </div>
          )}

          {/* production */}
          {d.production && (
            <div style={{ marginTop:6, paddingTop:18, borderTop:'1px solid var(--border)' }}>
              <h3 style={{ fontSize:14, marginBottom:14 }}>Website production</h3>
              <ProductionTimeline p={d.production} />
            </div>
          )}
        </div>

        <div className="row wrap" style={{ gap:8, padding:'14px 20px', borderTop:'1px solid var(--border)', flex:'none' }}>
          {d.stage==='call' && <><button className="btn btn-primary grow" onClick={()=>onAction('Founder call scheduled · '+d.client,'success')}><Icon name="clock" size={15}/> Schedule call</button><button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={()=>onAction('You took over · '+d.client)}>Take over</button></>}
          {d.stage==='approval' && <><button className="btn btn-primary grow" onClick={()=>onAction('Quote approved · '+d.client,'success')}><Icon name="check" size={15}/> Approve quote</button><button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={()=>onAction('Quote rejected · '+d.client,'warning')}>Reject</button></>}
          {d.stage==='pricing' && <><button className="btn btn-primary grow" onClick={()=>onAction('Quote approved & sent · '+d.client,'success')}>Approve AI reply</button><button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={()=>onAction('Editing reply · '+d.client)}>Edit reply</button></>}
          {d.stage==='created' && <><button className="btn btn-primary grow" onClick={()=>onAction('Reply sent · '+d.client,'success')}>Send suggested reply</button><button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={()=>onAction('Follow-up scheduled · '+d.client)}>Schedule follow-up</button></>}
          {d.stage==='won' && <><button className="btn btn-primary grow" onClick={()=>onAction('Content reminder sent · '+d.client,'success')}>Request assets</button><button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={()=>onAction('Marked delivered · '+d.client,'success')}>Mark delivered</button></>}
          <button className="btn btn-soft" onClick={()=>onAction('Summary requested · '+d.client)}>Ask summary</button>
        </div>
      </div>
    </>
  );
}

function DealsScreen({ onAction, initialLead }) {
  const [q,setQ]=useState('');
  const [stage,setStage]=useState('All');
  const [open,setOpen]=useState(initialLead ? (AV.dealByLead(initialLead)||{}).id : null);
  const STAGES=['All','Needs you','Pricing question','Deal created','Won'];
  const matchS=(d)=> stage==='All' ? true : stage==='Needs you' ? (d.stage==='call'||d.stage==='approval') : AV.DEAL_STAGE[d.stage].label===stage;
  const list=AV.deals.filter(d=>d.client.toLowerCase().includes(q.toLowerCase())&&matchS(d));
  const needYou=AV.deals.filter(d=>d.stage==='call'||d.stage==='approval').length;
  const weighted=Math.round(AV.deals.reduce((s,d)=>s+d.value*d.probability/100,0));
  const openDeal=open?AV.deals.find(d=>d.id===open):null;

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
        <div><h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('deals.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('deals.sub')}</p></div>
      </div>
      <OverviewBand items={[
        { label:'Open deals', value:AV.deals.filter(d=>d.stage!=='lost').length, icon:'deals' },
        { label:'Need your approval', value:needYou, icon:'alert', accent:'var(--warning)' },
        { label:'Weighted value', value:weighted, prefix:'$', icon:'dollar', accent:'var(--success)' },
        { label:'Won this week', value:1, icon:'check', accent:'var(--success)' },
        { label:'Avg win prob.', value:69, suffix:'%', icon:'activity' },
        { label:'In production', value:1, icon:'bolt', accent:'var(--primary)' },
      ]} />
      <div className="row wrap" style={{ gap:8, marginBottom:20 }}>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search client…" style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
        {STAGES.map(f=><button key={f} className={'chip'+(stage===f?' active':'')} onClick={()=>setStage(f)} style={{height:38}}>{f}</button>)}
      </div>
      {list.length===0
        ? <EmptyState icon="deals" title="No deals here" sub="Nothing matches this filter yet. Replies create deals automatically." />
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(330px,1fr))', gap:16 }}>
            {list.map(d=><DealCard key={d.id} d={d} onOpen={(id)=>setOpen(id)} onAction={onAction} />)}
          </div>}
      {openDeal && <DealDrawer deal={openDeal} onClose={()=>setOpen(null)} onAction={onAction} />}
    </div>
  );
}

Object.assign(window, { DealsScreen, DealCard, DealDrawer, ProductionTimeline, ProbBar });
