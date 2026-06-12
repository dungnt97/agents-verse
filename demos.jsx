/* =========================================================================
   AGENTS VERSE — Demo Preview Manager (grid + before/after detail)
   ========================================================================= */

function DemoThumb({ hue, label }) {
  return (
    <div style={{ position:'relative', paddingTop:'58%', borderBottom:'1px solid var(--border)' }}>
      <div style={{ position:'absolute', inset:0 }}><NewSite hue={hue} /></div>
      {label && <span className="mono" style={{ position:'absolute', left:10, bottom:9, fontSize:10, color:'#fff', background:'rgba(0,0,0,.45)', padding:'2px 7px', borderRadius:6, backdropFilter:'blur(4px)' }}>{label}</span>}
    </div>
  );
}

function DemoCard({ d, onOpen, onAction }) {
  const [hover, setHover] = useState(false);
  const hue = AV.hueFor(d.industry);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onOpen(d.id)}
      className="card" style={{ padding:0, overflow:'hidden', cursor:'pointer', transition:'transform .2s, box-shadow .2s, border-color .2s',
        transform: hover?'translateY(-3px)':'none', boxShadow: hover?'var(--sh-lg)':'var(--sh-sm)', borderColor: hover?'var(--border-strong)':'var(--border)' }}>
      <div style={{ position:'relative' }}>
        <DemoThumb hue={hue} label={d.demoUrl} />
        <span className={'badge '+d.statusCls} style={{ position:'absolute', top:10, right:10, boxShadow:'var(--sh-sm)' }}>{d.statusLabel}</span>
      </div>
      <div style={{ padding:'14px 15px' }}>
        <div className="row between" style={{ marginBottom:5 }}>
          <span style={{ fontSize:14.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.business}</span>
          <span className="mono" style={{ fontSize:12.5, fontWeight:600, color:'var(--success)' }}>{AV.fmt.k(d.value)}</span>
        </div>
        <div style={{ fontSize:12, color:'var(--ink-3)', marginBottom:12 }}>{d.industry} · {d.city}</div>
        <div className="row between">
          <div className="row" style={{ gap:9 }}>
            <span className="mono" style={{ fontSize:12, color:'var(--danger)' }}>{d.oldScore}</span>
            <Icon name="arrowR" size={13} style={{ color:'var(--ink-4)' }} />
            <span className="mono" style={{ fontSize:12, color:'var(--success)', fontWeight:600 }}>{d.newScore}</span>
          </div>
          <span className="row" style={{ gap:8 }}><AvatarStack ids={d.agents} size={22} max={3} /><span style={{ fontSize:11, color:'var(--ink-3)' }}>{d.generated}</span></span>
        </div>
      </div>
    </div>
  );
}

function DemoDrawer({ demo, onClose, onAction }) {
  const d = demo;
  const hue = AV.hueFor(d.industry);
  const first = d.business.split(' ')[0];
  const tones = {
    Friendly: d.outreach.body,
    Premium:  `Hi ${first} team — we took the liberty of rebuilding your homepage as a working concept. It's fast, refined and built to convert. No charge, no obligation — we'd genuinely value your eye on it.`,
    Direct:   `Hi ${first} team — we rebuilt your homepage. It loads faster, works on mobile, and drives more enquiries. Live demo inside. Worth two minutes?`,
    Local:    `Hi ${first} team — we're local and we rebuilt your ${d.city} homepage as a free working demo. Mobile-ready and easy for your customers. Mind taking a look?`,
  };
  const [tone, setTone] = useState('Friendly');
  const [body, setBody] = useState(tones.Friendly);
  const pickTone = (t) => { setTone(t); setBody(tones[t]); };
  const checks = Object.entries(d.checklist);
  const passed = checks.filter(([,v])=>v).length;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(20,18,12,.4)', backdropFilter:'blur(2px)', animation:'fade-in .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:680, maxWidth:'96vw', zIndex:121, background:'var(--surface)', borderLeft:'1px solid var(--border)', boxShadow:'var(--sh-xl)', display:'flex', flexDirection:'column', animation:'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flex:'none' }}>
          <div className="row" style={{ gap:12 }}>
            <div><div style={{ fontSize:16, fontWeight:600 }}>{d.business}</div><div style={{ fontSize:12.5, color:'var(--ink-3)' }}>{d.industry} · {d.city}</div></div>
            <span className={'badge '+d.statusCls}>{d.statusLabel}</span>
          </div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor:'var(--border)' }}><Icon name="x" size={17} /></button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          {/* before/after */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:10 }}>
            <div><div className="row between" style={{ marginBottom:8 }}><span className="eyebrow" style={{color:'var(--ink-3)'}}>Before</span><span className="badge badge-danger" style={{height:20}}>{d.oldScore}</span></div><SiteMock variant="old" hue={hue} chrome={false} ratio="64%" /></div>
            <div><div className="row between" style={{ marginBottom:8 }}><span className="eyebrow" style={{color:'var(--primary)'}}>After</span><span className="badge badge-success" style={{height:20}}>{d.newScore}</span></div><SiteMock variant="new" hue={hue} chrome={false} ratio="64%" /></div>
          </div>
          <div className="row between" style={{ padding:'10px 14px', borderRadius:11, background:'var(--success-soft)', marginBottom:20 }}>
            <span className="row" style={{ gap:8, fontSize:13, color:'var(--ink)', fontWeight:600 }}><Icon name="arrowUR" size={15} style={{color:'var(--success)'}}/> +{d.newScore-d.oldScore} point lift in conversion potential</span>
            <button className="btn btn-soft btn-sm" onClick={()=>onAction('Opened live demo · '+d.business)}>Open demo <Icon name="external" size={13}/></button>
          </div>

          {/* key changes + checklist */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
            <div>
              <h3 style={{ fontSize:14, marginBottom:12 }}>Key redesign changes</h3>
              <div className="col" style={{ gap:9 }}>
                {d.changes.map((c,i)=>(<div key={i} className="row" style={{ gap:10, alignItems:'flex-start' }}><Icon name="check" size={15} sw={2.2} style={{ color:'var(--primary)', flex:'none', marginTop:1 }}/><span style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.4 }}>{c}</span></div>))}
              </div>
            </div>
            <div>
              <div className="row between" style={{ marginBottom:12 }}><h3 style={{ fontSize:14 }}>Quality checklist</h3><span className="mono" style={{ fontSize:11.5, color: passed===checks.length?'var(--success)':'var(--warning)' }}>{passed}/{checks.length}</span></div>
              <div className="col" style={{ gap:8 }}>
                {checks.map(([k,v],i)=>(<div key={i} className="row" style={{ gap:10 }}><span style={{ width:18, height:18, borderRadius:6, display:'grid', placeItems:'center', flex:'none', background: v?'var(--success)':'var(--surface-muted)', color: v?'#fff':'var(--ink-3)', border: v?'none':'1px solid var(--border)' }}>{v?<Icon name="check" size={12} sw={2.6}/>:<Icon name="x" size={11}/>}</span><span style={{ fontSize:13, color: v?'var(--ink-2)':'var(--ink-3)' }}>{k}</span></div>))}
              </div>
            </div>
          </div>

          {/* agent notes */}
          <div style={{ padding:'13px 15px', borderRadius:12, background:'var(--surface-muted)', marginBottom:20 }}>
            <div className="row" style={{ gap:8, marginBottom:7 }}><AgentAvatar id={d.agents[0]} size={22}/><span style={{ fontSize:12.5, fontWeight:600 }}>{AV.agentById(d.agents[0])?.name}'s notes</span></div>
            <p style={{ fontSize:13, color:'var(--ink-2)', lineHeight:1.5 }}>{d.notes}</p>
          </div>

          {/* outreach */}
          <h3 style={{ fontSize:14, marginBottom:12 }}>Outreach message</h3>
          <div className="row" style={{ gap:7, marginBottom:12, flexWrap:'wrap' }}>
            {Object.keys(tones).map(t=>(<button key={t} className={'chip'+(tone===t?' active':'')} onClick={()=>pickTone(t)} style={{ height:30 }}>{t}</button>))}
          </div>
          <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border-soft)', fontSize:13 }}><span style={{ color:'var(--ink-3)' }}>Subject: </span><span style={{ fontWeight:600 }}>{d.outreach.subject}</span></div>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} style={{ width:'100%', border:'none', outline:'none', resize:'vertical', padding:'12px 14px', fontSize:13.5, lineHeight:1.5, color:'var(--ink)', background:'transparent', fontFamily:'var(--font-sans)' }} />
            <div className="row" style={{ gap:8, padding:'10px 14px', borderTop:'1px solid var(--border-soft)', background:'var(--surface-muted)' }}>
              <span className="row" style={{ gap:6, fontSize:11.5, color:'var(--ink-3)' }}><Icon name="globe" size={13}/> {d.demoUrl}</span>
              <span className="row" style={{ gap:6, fontSize:11.5, color:'var(--success)', marginLeft:'auto' }}><Icon name="shield" size={13}/> Within outreach guardrails</span>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap:10, padding:'14px 20px', borderTop:'1px solid var(--border)', flex:'none', flexWrap:'wrap' }}>
          {d.status==='review' && <button className="btn btn-primary grow" onClick={()=>onAction('Demo approved · '+d.business,'success')}><Icon name="check" size={16}/> Approve demo</button>}
          {d.status==='approved' && <button className="btn btn-primary grow" onClick={()=>onAction('Outreach prepared · '+d.business,'success')}><Icon name="send" size={15}/> Prepare outreach</button>}
          {(d.status==='sent'||d.status==='replied') && <button className="btn btn-primary grow" onClick={()=>onAction('Reply handling opened · '+d.business)}>Handle reply</button>}
          {d.status==='won' && <button className="btn btn-primary grow" onClick={()=>onAction('Production started · '+d.business,'success')}>Start production</button>}
          {d.status==='draft' && <button className="btn btn-primary grow" onClick={()=>onAction('Sent for review · '+d.business,'success')}>Send for review</button>}
          <button className="btn btn-ghost" style={{borderColor:'var(--border)'}} onClick={()=>onAction('Improvement requested')}><Icon name="spark" size={15}/> Improve with AI</button>
          <button className="btn btn-soft" onClick={()=>onAction('Demo link copied','success')}>Copy link</button>
        </div>
      </div>
    </>
  );
}

function DemoManager({ initialLead, onAction }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [ind, setInd] = useState('All industries');
  const [open, setOpen] = useState(initialLead ? ('demo-'+initialLead) : null);
  const STAT = ['All','Needs review','Approved','Sent','Client replied','Won'];
  const matchStat = (d) => status==='All' || d.statusLabel===status;
  const industries = ['All industries', ...Array.from(new Set(AV.demos.map(d=>d.industry)))];
  const list = AV.demos.filter(d => d.business.toLowerCase().includes(q.toLowerCase()) && matchStat(d) && (ind==='All industries'||d.industry===ind));
  const counts = { total:AV.demos.length, review:AV.demos.filter(d=>d.status==='review').length, sent:AV.demos.filter(d=>['sent','replied'].includes(d.status)).length, won:AV.demos.filter(d=>d.status==='won').length };
  const openDemo = open ? AV.demos.find(d=>d.id===open) : null;

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
        <div><h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('demos.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('demos.sub')}</p></div>
      </div>
      <OverviewBand items={[
        { label:'Total demos', value:counts.total, icon:'layers' },
        { label:'Need review', value:counts.review, icon:'alert', accent:'var(--warning)' },
        { label:'Sent', value:counts.sent, icon:'send', accent:'var(--info)' },
        { label:'Won', value:counts.won, icon:'deals', accent:'var(--success)' },
        { label:'Avg lift', value:51, suffix:' pts', icon:'arrowUR', accent:'var(--success)' },
        { label:'Pipeline', value:23.7, prefix:'$', suffix:'k', icon:'dollar' },
      ]} />
      <div className="row wrap" style={{ gap:10, marginBottom:20 }}>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search business…" style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
        <div className="row" style={{ gap:6, flexWrap:'wrap' }}>{STAT.map(f=><button key={f} className={'chip'+(status===f?' active':'')} onClick={()=>setStatus(f)} style={{height:38}}>{f}</button>)}</div>
        <select value={ind} onChange={e=>setInd(e.target.value)} className="focusable" style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500, marginLeft:'auto' }}>
          {industries.map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      {list.length===0
        ? <EmptyState icon="layers" title="No demos match" sub="Try a different status or search term." />
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
            {list.map(d => <DemoCard key={d.id} d={d} onOpen={(id)=>setOpen(id)} onAction={onAction} />)}
          </div>}
      {openDemo && <DemoDrawer demo={openDemo} onClose={()=>setOpen(null)} onAction={onAction} />}
    </div>
  );
}

Object.assign(window, { DemoManager, DemoCard, DemoDrawer });
