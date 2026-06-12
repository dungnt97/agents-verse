/* =========================================================================
   AGENTS VERSE — Activity (full system timeline)
   ========================================================================= */

const ACT_TYPE = {
  lead:      { label:'Lead',       icon:'leads',    color:'var(--info)' },
  audit:     { label:'Audit',      icon:'audits',   color:'var(--info)' },
  demo:      { label:'Demo',       icon:'layers',   color:'var(--violet)' },
  outreach:  { label:'Outreach',   icon:'send',     color:'var(--primary)' },
  reply:     { label:'Reply',      icon:'activity', color:'var(--success)' },
  deal:      { label:'Deal',       icon:'deals',    color:'var(--success)' },
  escalate:  { label:'Escalation', icon:'alert',    color:'var(--danger)' },
  cost:      { label:'Cost',       icon:'dollar',   color:'var(--warning)' },
  production:{ label:'Production', icon:'bolt',     color:'var(--primary)' },
};

function ActivityScreen({ onAction, goAgent, goRoom }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const filters = ['All','Leads','Demos','Outreach','Replies','Deals','Escalations','Cost','Production'];
  const FMAP = { 'Leads':'lead','Demos':'demo','Outreach':'outreach','Replies':'reply','Deals':'deal','Escalations':'escalate','Cost':'cost','Production':'production' };
  const list = AV.activity.filter(a =>
    (filter==='All' || a.type===FMAP[filter]) &&
    (a.text + (AV.agentById(a.agent)?.name||'') + (AV.roomById(a.room)?.name||'')).toLowerCase().includes(q.toLowerCase())
  );
  const counts = AV.activity.reduce((m,a)=>{ m[a.type]=(m[a.type]||0)+1; return m; }, {});

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:20 }}>
        <div>
          <div className="row" style={{ gap:11, marginBottom:6 }}><h1 style={{ fontSize:28, letterSpacing:'-0.03em' }}>{t('act.title')}</h1><span className="badge badge-neutral"><span className="pulse" /> {t('ov.live')}</span></div>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('act.sub')}</p>
        </div>
        <button className="btn btn-ghost" style={{ borderColor:'var(--border)' }} onClick={()=>onAction('Activity exported')}><Icon name="doc" size={16}/> Export log</button>
      </div>

      {/* filters */}
      <div className="row between wrap" style={{ gap:12, marginBottom:22 }}>
        <div className="row" style={{ gap:6, flexWrap:'wrap' }}>
          {filters.map(f=>{ const t=FMAP[f]; const c=f==='All'?AV.activity.length:(counts[t]||0); return (
            <button key={f} className={'chip'+(filter===f?' active':'')} onClick={()=>setFilter(f)} style={{ height:34 }}>
              {f}<span className="mono" style={{ fontSize:11, opacity:.7, marginLeft:2 }}>{c}</span>
            </button>
          );})}
        </div>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search activity…" style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
      </div>

      {/* timeline */}
      {list.length===0
        ? <EmptyState icon="activity" title="No activity" sub="Nothing matches this filter yet. Events stream in as your agents work." />
        : (
          <div className="card" style={{ padding:'8px 22px' }}>
            <div className="eyebrow" style={{ padding:'14px 0 6px' }}>Today</div>
            {list.map((a,i)=>{
              const t = ACT_TYPE[a.type] || ACT_TYPE.lead;
              const ag = AV.agentById(a.agent); const room = AV.roomById(a.room);
              return (
                <div key={i} className="row" style={{ gap:16, alignItems:'stretch' }}>
                  {/* time + rail */}
                  <div className="row" style={{ gap:14, flex:'none' }}>
                    <span className="mono" style={{ fontSize:11.5, color:'var(--ink-3)', width:42, textAlign:'right', paddingTop:16 }}>{a.t}</span>
                    <div className="col center" style={{ width:14 }}>
                      <span style={{ width:3, height:14, background: i===0?'transparent':'var(--border)' }} />
                      <span style={{ width:11, height:11, borderRadius:99, background:t.color, flex:'none', boxShadow:`0 0 0 3px color-mix(in oklab, ${t.color} 16%, transparent)` }} />
                      <span style={{ width:3, flex:1, background: i===list.length-1?'transparent':'var(--border)' }} />
                    </div>
                  </div>
                  {/* content */}
                  <div className="row between" style={{ flex:1, gap:14, padding:'13px 0', borderBottom: i===list.length-1?'none':'1px solid var(--border-soft)', alignItems:'center' }}>
                    <div className="row" style={{ gap:12, minWidth:0 }}>
                      <span style={{ width:34, height:34, borderRadius:10, display:'grid', placeItems:'center', flex:'none', background:`color-mix(in oklab, ${t.color} 13%, transparent)`, color:t.color }}><Icon name={t.icon} size={17} /></span>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, lineHeight:1.35 }}>{a.text}</div>
                        <div className="row" style={{ gap:8, marginTop:4 }}>
                          <button onClick={()=>goAgent&&goAgent(a.agent)} className="row focusable" style={{ gap:6 }}>
                            <AgentAvatar id={a.agent} size={17} /><span className="mono" style={{ fontSize:11, color:'var(--ink-3)' }}>{ag?.name}</span>
                          </button>
                          <span style={{ width:3, height:3, borderRadius:99, background:'var(--border-strong)' }} />
                          <button onClick={()=>goRoom&&goRoom(a.room)} style={{ fontSize:11.5, color:'var(--ink-3)' }} className="focusable">{room?.short}</button>
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-neutral" style={{ flex:'none', color:t.color, background:`color-mix(in oklab, ${t.color} 10%, transparent)` }}><span className="dot" style={{ background:t.color }} />{t.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

Object.assign(window, { ActivityScreen, ACT_TYPE });
