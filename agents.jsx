/* =========================================================================
   AGENTS VERSE — Agents Index + Agent Detail
   ========================================================================= */

function AgentCard({ id, onOpen, onRoom }) {
  const a = AV.agentById(id);
  const [hover, setHover] = useState(false);
  const room = AV.roomById(a.room);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>onOpen(a.id)}
      className="card" style={{ padding:'17px 18px', cursor:'pointer', transition:'transform .2s, box-shadow .2s, border-color .2s',
        transform: hover?'translateY(-3px)':'none', boxShadow: hover?'var(--sh-lg)':'var(--sh-sm)', borderColor: hover?'var(--border-strong)':'var(--border)' }}>
      <div className="row between" style={{ marginBottom:14 }}>
        <span className="row" style={{ gap:12, minWidth:0 }}>
          <AgentAvatar id={a.id} size={44} />
          <span style={{ minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:600, letterSpacing:'-0.02em' }}>{a.name}</div>
            <div style={{ fontSize:12.5, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.role}</div>
          </span>
        </span>
        <ConfidenceRing value={a.conf} size={42} />
      </div>
      <div className="row" style={{ gap:8, marginBottom:13 }}>
        <StatusBadge status={a.status} sm />
        <button onClick={(e)=>{e.stopPropagation();onRoom(a.room);}} className="badge badge-neutral focusable" style={{ height:21, fontSize:11.5 }}>
          <Icon name={ROOM_ICON[a.room]} size={11} /> {room.short}
        </button>
      </div>
      <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--surface-muted)', marginBottom:14, minHeight:54 }}>
        <div className="eyebrow" style={{ fontSize:9.5, marginBottom:4 }}>Current task</div>
        <div style={{ fontSize:12.5, fontWeight:500, color:'var(--ink-2)', lineHeight:1.4 }}>{a.task}</div>
      </div>
      <div className="row between" style={{ fontSize:12 }}>
        {[['Tasks',a.tasks],['Quality',a.quality],['Cost','$'+a.cost.toFixed(2)]].map(([l,v],i)=>(
          <span key={i} className="col" style={{ alignItems: i===0?'flex-start':i===2?'flex-end':'center', flex:1 }}>
            <span className="mono" style={{ fontSize:14, fontWeight:600, color:'var(--ink)' }}>{v}</span>
            <span style={{ fontSize:10.5, color:'var(--ink-3)' }}>{l} today</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function AgentsIndex({ onOpen, onRoom }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [roomF, setRoomF] = useState('All rooms');
  const [sort, setSort] = useState('Top quality');
  const STAT = { 'All':()=>true,'Working':a=>a.status==='working','Needs review':a=>a.status==='review','Waiting':a=>a.status==='waiting','Escalating':a=>a.status==='escalate','Idle':a=>a.status==='idle' };
  const SORT = { 'Top quality':(a,b)=>b.quality-a.quality, 'Highest confidence':(a,b)=>b.conf-a.conf, 'Most tasks':(a,b)=>b.tasks-a.tasks, 'Highest cost':(a,b)=>b.cost-a.cost };
  let list = AV.agents.filter(STAT[status])
    .filter(a => roomF==='All rooms' || AV.roomById(a.room).name===roomF)
    .filter(a => (a.name+a.role).toLowerCase().includes(q.toLowerCase()));
  list = [...list].sort(SORT[sort]);
  const avgConf = Math.round(AV.agents.reduce((s,a)=>s+a.conf,0)/AV.agents.length);
  const needReview = AV.agents.filter(a=>a.status==='review'||a.status==='escalate').length;

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
        <div>
          <h1 style={{ fontSize:28, letterSpacing:'-0.03em', marginBottom:6 }}>{t('agents.title')}</h1>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('agents.sub')}</p>
        </div>
      </div>
      <OverviewBand items={[
        { label:'Total agents', value:11, icon:'agents' },
        { label:'Active now', value:6, icon:'activity', accent:'var(--success)' },
        { label:'Need review', value:needReview, icon:'alert', accent:'var(--warning)' },
        { label:'Avg confidence', value:avgConf, suffix:'%', icon:'shield' },
        { label:'Tasks today', value:238, icon:'check' },
        { label:'AI cost today', value:42.8, icon:'bolt', accent:'var(--warning)' },
      ]} />
      {/* filters */}
      <div className="row between wrap" style={{ gap:12, marginBottom:20 }}>
        <div className="row" style={{ gap:10, flexWrap:'wrap' }}>
          <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
            <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search agents…" style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
          </div>
          <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
            {Object.keys(STAT).map(f=>(<button key={f} className={'chip'+(status===f?' active':'')} onClick={()=>setStatus(f)} style={{height:38}}>{f}</button>))}
          </div>
        </div>
        <div className="row" style={{ gap:8 }}>
          <select value={roomF} onChange={e=>setRoomF(e.target.value)} className="focusable" style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>
            <option>All rooms</option>{AV.rooms.filter(r=>r.id!=='ceo').map(r=><option key={r.id}>{r.name}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="focusable" style={{ height:38, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', fontWeight:500 }}>
            {Object.keys(SORT).map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {list.length===0
        ? <EmptyState icon="agents" title="No agents match" sub="Try clearing a filter or searching a different name." />
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:18 }}>
            {list.map(a => <AgentCard key={a.id} id={a.id} onOpen={onOpen} onRoom={onRoom} />)}
          </div>}
    </div>
  );
}

/* ---------------------------- AGENT DETAIL ---------------------------- */
function FounderChat({ agent, onAction }) {
  const d = AV.agentDetail(agent.id);
  const [msgs, setMsgs] = useState([{ role:'agent', text:`I’m on it — ${agent.task[0].toLowerCase()+agent.task.slice(1)}. Confidence ${agent.conf}%. Ask me anything or steer the work.` }]);
  const [val, setVal] = useState('');
  const scrollRef = useRef(null);
  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs]);
  const reply = (text) => {
    const canned = {
      style:'I chose a calm, premium direction because the client is in a trust-driven category — clean type, generous spacing, and one clear booking CTA convert better there.',
      premium:'Understood. I’ll deepen the visual hierarchy, refine the type scale and add a more editorial hero. New version in ~2 minutes.',
      before:'The original scored low on mobile UX and CTA clarity. My redesign fixes the hero, adds trust signals, and makes booking one tap — a +51 point lift.',
      mobile:'Prioritizing mobile now — stacking the hero, enlarging tap targets to 48px, and moving the booking CTA above the fold.',
    };
    const key = /style/i.test(text)?'style':/premium/i.test(text)?'premium':/before|after|reason/i.test(text)?'before':/mobile/i.test(text)?'mobile':null;
    return key ? canned[key] : 'Got it. I’ll factor that into the current task and flag you if it pushes confidence below the review threshold.';
  };
  const send = (text) => {
    if(!text.trim()) return;
    setMsgs(m => [...m, { role:'you', text }]);
    setVal('');
    setTimeout(()=> setMsgs(m => [...m, { role:'agent', text: reply(text) }]), 550);
  };
  return (
    <div className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
      <div className="row between" style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
        <div className="row" style={{ gap:9 }}><Icon name="command" size={16} style={{color:'var(--primary)'}}/><h2 style={{ fontSize:15 }}>Founder controls</h2></div>
        <span className="badge badge-success" style={{height:20}}><span className="pulse" style={{background:'var(--success)'}}/> online</span>
      </div>
      <div ref={scrollRef} style={{ padding:16, display:'flex', flexDirection:'column', gap:10, maxHeight:280, overflowY:'auto' }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ alignSelf: m.role==='you'?'flex-end':'flex-start', maxWidth:'88%' }}>
            <div style={{ padding:'9px 12px', borderRadius:13, fontSize:13, lineHeight:1.45,
              background: m.role==='you'?'var(--primary)':'var(--surface-muted)', color: m.role==='you'?'#fff':'var(--ink)',
              borderBottomRightRadius: m.role==='you'?4:13, borderBottomLeftRadius: m.role==='you'?13:4 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'0 16px 12px' }}>
        <div className="row" style={{ gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {d.chatPrompts.slice(0,3).map((p,i)=>(<button key={i} onClick={()=>send(p)} className="chip" style={{ height:28, fontSize:11.5 }}>{p}</button>))}
        </div>
        <div className="row" style={{ gap:8 }}>
          <input value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(val)} placeholder={`Message ${agent.name}…`}
            style={{ flex:1, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', outline:'none' }} />
          <button className="btn btn-primary btn-icon" onClick={()=>send(val)}><Icon name="send" size={16} /></button>
        </div>
      </div>
    </div>
  );
}

function AgentDetail({ agentId, onBack, onRoom, onAction }) {
  const a = AV.agentById(agentId) || AV.agentById('nova');
  const d = AV.agentDetail(a.id);
  const room = AV.roomById(a.room);
  const sm = AV.statusMap[a.status];

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <button onClick={onBack} className="row focusable" style={{ gap:7, fontSize:13, color:'var(--ink-3)', marginBottom:16 }}>
        <Icon name="chevR" size={14} style={{ transform:'rotate(180deg)' }} /> All agents
      </button>
      {/* header */}
      <div className="row between wrap" style={{ gap:16, marginBottom:24 }}>
        <div className="row" style={{ gap:16 }}>
          <AgentAvatar id={a.id} size={64} />
          <div>
            <div className="row" style={{ gap:11, marginBottom:6 }}>
              <h1 style={{ fontSize:26, letterSpacing:'-0.03em', whiteSpace:'nowrap' }}>{a.name}</h1>
              <StatusBadge status={a.status} />
            </div>
            <div className="row" style={{ gap:9, fontSize:14 }}>
              <span style={{ color:'var(--ink-2)' }}>{a.role}</span>
              <span style={{ width:3, height:3, borderRadius:99, background:'var(--border-strong)' }} />
              <button onClick={()=>onRoom(a.room)} className="row focusable" style={{ gap:6, color:'var(--primary)', fontWeight:600 }}><Icon name={ROOM_ICON[a.room]} size={14} /> {room.name}</button>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}} onClick={()=>onAction('Improvement requested from '+a.name)}><Icon name="spark" size={15}/> Improve output</button>
          <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}} onClick={()=>onAction(a.name+' reassigned')}>Reassign</button>
          <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}} onClick={()=>onAction(a.name+' paused','warning')}><Icon name="pause" size={15}/> Pause</button>
          <button className="btn btn-soft btn-sm" onClick={()=>onAction('Escalated '+a.name,'warning')}>Escalate</button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 360px', gap:20, alignItems:'start' }} className="floor-grid">
        {/* main */}
        <div className="col" style={{ gap:20 }}>
          {/* current task */}
          <div className="card" style={{ padding:18 }}>
            <div className="row between" style={{ marginBottom:14 }}>
              <h2 style={{ fontSize:16 }}>Current task</h2>
              <ConfidenceRing value={a.conf} size={40} />
            </div>
            <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--primary-soft)', marginBottom:14 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--ink)' }}>{a.task}</div>
            </div>
            <p style={{ fontSize:14, color:'var(--ink-2)', lineHeight:1.5 }}>{d.purpose}</p>
          </div>

          {/* skills + tools */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }} className="floor-grid">
            <div className="card" style={{ padding:18 }}>
              <h2 style={{ fontSize:16, marginBottom:14 }}>Skills</h2>
              <div className="row wrap" style={{ gap:8 }}>
                {d.skills.map(s=>(<span key={s} className="chip" style={{ height:30, cursor:'default', background:'var(--surface-muted)' }}>{s}</span>))}
              </div>
            </div>
            <div className="card" style={{ padding:18 }}>
              <h2 style={{ fontSize:16, marginBottom:14 }}>Tools enabled</h2>
              <div className="col" style={{ gap:9 }}>
                {d.tools.map(t=>(<div key={t} className="row between"><span className="row" style={{gap:10}}><Icon name="bolt" size={14} style={{color:'var(--ink-3)'}}/><span style={{fontSize:13.5}}>{t}</span></span><span style={{ width:30, height:18, borderRadius:99, background:'var(--success)', position:'relative', flex:'none' }}><span style={{ position:'absolute', right:2, top:2, width:14, height:14, borderRadius:99, background:'#fff' }}/></span></div>))}
              </div>
            </div>
          </div>

          {/* recent outputs */}
          {d.outputs.length>0 && (
            <div className="card" style={{ padding:18 }}>
              <h2 style={{ fontSize:16, marginBottom:14 }}>Recent outputs</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
                {d.outputs.map((o,i)=>(
                  <div key={i} style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' }}>
                    <div style={{ position:'relative', paddingTop:'62%' }}><div style={{ position:'absolute', inset:0 }}><NewSite hue={o.hue} /></div></div>
                    <div style={{ padding:'10px 11px' }}><div style={{ fontSize:12.5, fontWeight:600, lineHeight:1.25, marginBottom:3 }}>{o.title.split(' — ')[0]}</div><div style={{ fontSize:11, color:'var(--ink-3)' }}>{o.meta}</div></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* history */}
          <div className="card" style={{ padding:18 }}>
            <h2 style={{ fontSize:16, marginBottom:16 }}>Task history</h2>
            <div>{d.history.map((e,i)=><TimelineItem key={i} e={e} last={i===d.history.length-1} />)}</div>
          </div>
        </div>

        {/* right rail */}
        <div className="col" style={{ gap:20 }}>
          <div className="card" style={{ padding:18 }}>
            <h2 style={{ fontSize:16, marginBottom:16 }}>Performance</h2>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {[['Tasks completed',a.tasks],['Avg quality',a.quality],['Approval rate',d.approval+'%'],['Cost today','$'+a.cost.toFixed(2)]].map(([l,v],i)=>(
                <div key={i} style={{ padding:'13px 14px', borderRadius:12, background:'var(--surface-muted)' }}>
                  <div style={{ fontSize:21, fontWeight:600, letterSpacing:'-0.02em' }} className="tabular">{v}</div>
                  <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:3 }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="row between" style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border-soft)' }}>
              <span style={{ fontSize:13, color:'var(--ink-2)' }}>Escalates below</span>
              <span className="mono" style={{ fontSize:13, fontWeight:600 }}>{d.escalationThreshold}% confidence</span>
            </div>
          </div>
          <FounderChat agent={a} onAction={onAction} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AgentsIndex, AgentDetail, AgentCard, FounderChat });
