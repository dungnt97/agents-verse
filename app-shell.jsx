/* =========================================================================
   AGENTS VERSE — App shell (sidebar, top bar, command palette, autonomy)
   ========================================================================= */

const NAV = [
  { group: null, items: [
    { id:'overview', label:'Overview',       icon:'overview', live:true },
    { id:'command',  label:'Command Center', icon:'command',  live:true, badge:3 },
  ]},
  { group: 'Workspace', items: [
    { id:'rooms',  label:'Rooms',  icon:'rooms' },
    { id:'agents', label:'Agents', icon:'agents' },
  ]},
  { group: 'Pipeline', items: [
    { id:'requests', label:'Demo requests', icon:'send' },
    { id:'leads',  label:'Leads',  icon:'leads' },
    { id:'audits', label:'Audits', icon:'audits' },
    { id:'demos',  label:'Demos',  icon:'demos' },
    { id:'deals',  label:'Deals',  icon:'deals' },
  ]},
  { group: 'System', items: [
    { id:'activity', label:'Activity', icon:'activity' },
    { id:'settings', label:'Settings', icon:'settings' },
  ]},
];

const AUTONOMY = [
  { id:'manual',   label:'Manual',                  short:'Manual',                desc:'AI suggests. You approve every action.' },
  { id:'review',   label:'Review before action',    short:'Review first',          desc:'AI prepares work. You approve anything external.' },
  { id:'guarded',  label:'Autonomous + guardrails', short:'Guardrailed',           desc:'AI completes low-risk work. You approve risk.' },
  { id:'full',     label:'Fully autonomous',        short:'Fully autonomous',      desc:'AI acts within rules. Escalates critical issues.' },
];

function AutonomyControl({ mode, setMode }) {
  const [open, setOpen] = useState(false);
  const cur = AUTONOMY.find(a => a.id === mode);
  const idx = AUTONOMY.findIndex(a => a.id === mode);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="focusable" style={{ width: '100%', textAlign: 'left',
        padding: '11px 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface-elev)', boxShadow: 'var(--sh-xs)' }}>
        <div className="row between" style={{ marginBottom: 9 }}>
          <span className="eyebrow" style={{ fontSize: 10 }}>Autonomy</span>
          <Icon name="chevD" size={13} style={{ color: 'var(--ink-3)', transform: open?'rotate(180deg)':'none', transition:'.2s' }} />
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="pulse" style={{ background: 'var(--primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace:'nowrap' }}>{cur.short}</span>
        </div>
        <div className="row" style={{ gap: 3, marginTop: 9 }}>
          {AUTONOMY.map((a,i)=>(<span key={a.id} style={{ flex:1, height:3, borderRadius:2, background: i<=idx?'var(--primary)':'var(--surface-sunk)' }} />))}
        </div>
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex:60 }} />
          <div className="card-elev" style={{ position:'absolute', bottom:'calc(100% + 8px)', left:0, right:0, zIndex:61, padding:6, boxShadow:'var(--sh-xl)' }}>
            {AUTONOMY.map(a => (
              <button key={a.id} onClick={()=>{setMode(a.id);setOpen(false);}} className="focusable" style={{ width:'100%', textAlign:'left', padding:'10px 11px', borderRadius:9,
                background: a.id===mode?'var(--primary-soft)':'transparent' }}
                onMouseEnter={e=>{if(a.id!==mode)e.currentTarget.style.background='var(--surface-muted)';}}
                onMouseLeave={e=>{if(a.id!==mode)e.currentTarget.style.background='transparent';}}>
                <div className="row between"><span style={{ fontSize:13, fontWeight:600, color:a.id===mode?'var(--primary)':'var(--ink)' }}>{a.label}</span>{a.id===mode&&<Icon name="check" size={14} style={{color:'var(--primary)'}}/>}</div>
                <div style={{ fontSize:11.5, color:'var(--ink-3)', marginTop:2, lineHeight:1.35 }}>{a.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CommandPalette({ open, onClose, onNav }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQ(''); setTimeout(()=>inputRef.current&&inputRef.current.focus(), 50); } }, [open]);
  if (!open) return null;
  const pages = NAV.flatMap(g => g.items).map(i => ({ type:'Page', id:i.id, label:i.label, icon:i.icon }));
  const ag = AV.agents.map(a => ({ type:'Agent', id:'agents', label:a.name+' — '+a.role, icon:'agents' }));
  const ld = AV.leads.map(l => ({ type:'Lead', id:'leads', label:l.company, icon:'leads' }));
  const all = [...pages, ...ag, ...ld].filter(x => x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(20,18,12,.4)', backdropFilter:'blur(3px)', display:'flex', justifyContent:'center', paddingTop:'14vh' }}>
      <div onClick={e=>e.stopPropagation()} className="card-elev" style={{ width:560, maxWidth:'92vw', height:'fit-content', maxHeight:'62vh', overflow:'hidden', boxShadow:'var(--sh-xl)', padding:0 }}>
        <div className="row" style={{ gap:11, padding:'15px 18px', borderBottom:'1px solid var(--border)' }}>
          <Icon name="search" size={18} style={{ color:'var(--ink-3)' }} />
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search pages, agents, leads…"
            style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:15.5, color:'var(--ink)' }} />
          <span className="mono" style={{ fontSize:11, color:'var(--ink-3)', border:'1px solid var(--border)', borderRadius:5, padding:'2px 6px' }}>ESC</span>
        </div>
        <div style={{ padding:8, overflowY:'auto', maxHeight:'48vh' }}>
          {all.length===0 && <div style={{ padding:'28px', textAlign:'center', color:'var(--ink-3)', fontSize:14 }}>No results for “{q}”</div>}
          {all.map((x,i)=>(
            <button key={i} onClick={()=>{onNav(x.id);onClose();}} className="row between focusable" style={{ width:'100%', padding:'10px 12px', borderRadius:9, textAlign:'left' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface-muted)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span className="row" style={{ gap:12 }}>
                <span style={{ width:30, height:30, borderRadius:8, background:'var(--surface-muted)', color:'var(--ink-2)', display:'grid', placeItems:'center' }}><Icon name={x.icon} size={16}/></span>
                <span style={{ fontSize:14, fontWeight:500 }}>{x.label}</span>
              </span>
              <span className="badge badge-neutral" style={{ height:19, fontSize:10.5 }}>{x.type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ route, onNav, mode, setMode, onLanding, badges = {}, mobileOpen, onClose, onLogout, user }) {
  return (
    <aside className={'av-sidebar' + (mobileOpen ? ' open' : '')} style={{ width:'var(--shell-side)', flex:'none', borderRight:'1px solid var(--border)', background:'var(--surface)',
      display:'flex', flexDirection:'column', height:'100vh', position:'sticky', top:0 }}>
      <div style={{ padding:'18px 16px 14px' }}><Logo size={26} /></div>
      <nav style={{ flex:1, overflowY:'auto', padding:'4px 12px' }}>
        {NAV.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 14 }}>
            {g.group && <div className="eyebrow" style={{ fontSize:10, padding:'0 10px 8px' }}>{t('app.'+g.group.toLowerCase())}</div>}
            <div className="col" style={{ gap:1 }}>
              {g.items.map(it => {
                const active = route === it.id;
                const badge = badges[it.id] != null ? badges[it.id] : it.badge;
                return (
                  <button key={it.id} onClick={()=>onNav(it.id)} className="row between focusable" style={{
                    padding:'8px 10px', borderRadius:9, textAlign:'left', width:'100%', position:'relative',
                    background: active?'var(--primary-soft)':'transparent', transition:'background .15s' }}
                    onMouseEnter={e=>{if(!active)e.currentTarget.style.background='var(--surface-muted)';}}
                    onMouseLeave={e=>{if(!active)e.currentTarget.style.background='transparent';}}>
                    <span className="row" style={{ gap:11 }}>
                      <Icon name={it.icon} size={18} style={{ color: active?'var(--primary)':'var(--ink-3)' }} />
                      <span style={{ fontSize:14, fontWeight: active?600:500, color: active?'var(--primary)':'var(--ink)' }}>{t('app.'+it.id)||it.label}</span>
                    </span>
                    {badge && <span style={{ minWidth:18, height:18, padding:'0 5px', borderRadius:99, background:'var(--warning)', color:'#fff', fontSize:11, fontWeight:600, display:'grid', placeItems:'center' }}>{badge}</span>}
                    {!it.live && !badge && <span style={{ width:5, height:5, borderRadius:99, background:'var(--border-strong)' }} title="Coming next" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div style={{ padding:12, borderTop:'1px solid var(--border)' }}>
        <AutonomyControl mode={mode} setMode={setMode} />
        <button onClick={onLanding} className="row focusable" style={{ gap:11, width:'100%', padding:'9px 10px', borderRadius:9, marginTop:8 }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--surface-muted)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
          <Icon name="globe" size={17} style={{ color:'var(--ink-3)' }} /><span style={{ fontSize:13.5, color:'var(--ink-2)' }}>{t('app.landingPreview')}</span>
          <Icon name="arrowUR" size={13} style={{ color:'var(--ink-3)', marginLeft:'auto' }} />
        </button>
        <div className="row" style={{ gap:10, marginTop:10, padding:'8px 6px' }}>
          <span style={{ width:34, height:34, borderRadius:'32%', background:'linear-gradient(145deg,#3a3a3a,#1a1a1a)', color:'#fff', display:'grid', placeItems:'center', fontWeight:600, fontSize:14, flex:'none' }}>{(user||'F')[0].toUpperCase()}</span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user ? user.split('@')[0] : 'Founder'}</div>
            <div style={{ fontSize:11.5, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user || 'Agents Verse'}</div>
          </div>
          <button onClick={onLogout} className="btn btn-icon focusable" title={t('auth.logout')} aria-label={t('auth.logout')} style={{ width:32, height:32, flex:'none', color:'var(--ink-3)' }}
            onMouseEnter={e=>{e.currentTarget.style.background='var(--surface-muted)';e.currentTarget.style.color='var(--danger)';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--ink-3)';}}>
            <Icon name="arrowUR" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function TopBar({ crumbs, mode, onSearch, onReview, theme, onToggle, actions, onMenu }) {
  const cur = AUTONOMY.find(a => a.id === mode);
  return (
    <div style={{ height:'var(--shell-top)', flex:'none', borderBottom:'1px solid var(--border)', background:'color-mix(in oklab, var(--bg) 78%, transparent)',
      backdropFilter:'saturate(180%) blur(12px)', position:'sticky', top:0, zIndex:40, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px' }}>
      <div className="row" style={{ gap:8, fontSize:14 }}>
        <button className="btn btn-icon btn-ghost focusable av-topbar-menu" onClick={onMenu} aria-label="Menu" style={{ borderColor:'var(--border)', marginRight:4 }}><Icon name="menu" size={18} /></button>
        {crumbs.map((c, i) => (
          <span key={i} className="row" style={{ gap:8 }}>
            {i>0 && <Icon name="chevR" size={14} style={{ color:'var(--ink-4)' }} />}
            <span style={{ color: i===crumbs.length-1?'var(--ink)':'var(--ink-3)', fontWeight: i===crumbs.length-1?600:500 }}>{c}</span>
          </span>
        ))}
      </div>
      <div className="row" style={{ gap:10 }}>
        <button onClick={onSearch} className="row focusable" style={{ gap:10, height:36, padding:'0 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink-3)' }}>
          <Icon name="search" size={15} /><span style={{ fontSize:13 }} className="hide-mobile">{t('app.search')}</span>
          <span className="mono hide-mobile" style={{ fontSize:11, border:'1px solid var(--border)', borderRadius:4, padding:'1px 5px' }}>⌘K</span>
        </button>
        {actions}
        <LangToggle />
        <button onClick={onReview} className="btn btn-icon btn-ghost focusable" style={{ borderColor:'var(--border)', position:'relative' }} aria-label="Reviews">
          <Icon name="bell" size={17} />
          <span style={{ position:'absolute', top:6, right:6, width:8, height:8, borderRadius:99, background:'var(--warning)', border:'2px solid var(--surface)' }} />
        </button>
        <ThemeToggle theme={theme} onToggle={onToggle} />
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, TopBar, CommandPalette, AutonomyControl, NAV, AUTONOMY });
