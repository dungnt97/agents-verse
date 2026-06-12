/* =========================================================================
   AGENTS VERSE — Root app: routing, theme, autonomy, review center
   ========================================================================= */

const ROUTE_META = {
  overview: { label:'Overview' },
  command:  { label:'Command Center' },
  rooms:    { label:'Rooms', icon:'rooms', desc:'Scan every department at a glance — status, active agents, output and health — then drill into any room to inspect and control it.' },
  agents:   { label:'Agents', icon:'agents', desc:'The full AI workforce: each agent’s role, room, live task, confidence, quality and cost — with controls to pause, reassign or coach.' },
  leads:    { label:'Leads', icon:'leads', desc:'A demo-first pipeline from Found → Audited → Demo → Contacted → Replied → Won, with drag-to-move stages and per-lead actions.' },
  audits:   { label:'Audits', icon:'audits', desc:'Professional website audit reports — scores across design, mobile, trust and conversion, with detected problems and a suggested redesign direction.' },
  demos:    { label:'Demos', icon:'demos', desc:'Manage AI-generated website demos: before/after previews, quality checklist, approval status, shareable links and outreach drafts.' },
  deals:    { label:'Deals', icon:'deals', desc:'Quotes, approvals and the post-reply deal flow — package, price, probability and the human-call escalation path.' },
  activity: { label:'Activity', icon:'activity', desc:'The full system timeline: every lead found, demo generated, message sent, reply handled and escalation triggered across the company.' },
  settings: { label:'Settings', icon:'settings', desc:'Automation rules and guardrails — autonomy mode, pricing thresholds, outreach limits, escalation rules and AI cost budgets.' },
};

function ComingSoon({ route, onBack }) {
  const meta = ROUTE_META[route] || {};
  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1480, margin:'0 auto' }}>
      <div style={{ maxWidth:560, margin:'8vh auto 0', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:18, margin:'0 auto 24px', display:'grid', placeItems:'center',
          background:'var(--surface)', border:'1px solid var(--border)', color:'var(--primary)', boxShadow:'var(--sh-md)' }}>
          <Icon name={meta.icon} size={28} />
        </div>
        <div className="badge badge-primary" style={{ marginBottom:16 }}>Phase 2 · in design</div>
        <h1 style={{ fontSize:30, letterSpacing:'-0.03em', marginBottom:14 }}>{meta.label}</h1>
        <p style={{ fontSize:16, color:'var(--ink-2)', lineHeight:1.55, marginBottom:30, textWrap:'pretty' }}>{meta.desc}</p>
        <div className="row center" style={{ gap:10 }}>
          <button className="btn btn-ghost" onClick={onBack} style={{ borderColor:'var(--border)' }}><Icon name="overview" size={16}/> Back to Overview</button>
          <button className="btn btn-primary" onClick={onBack}>Open Command Center</button>
        </div>
        <p style={{ fontSize:12.5, color:'var(--ink-3)', marginTop:30 }}>The first three screens — Landing, Floor Overview and Command Center — set the design bar for this page.</p>
      </div>
    </div>
  );
}

function ReviewCenter({ open, onClose, onAction }) {
  if (!open) return null;
  const items = [
    { ic:'layers', t:'Demo needs approval', d:'Atlas Dental Clinic · 34 → 88', cls:'badge-primary', tag:'Demo' },
    { ic:'send',   t:'Outreach needs review', d:'GreenBite Restaurant · friendly tone', cls:'badge-info', tag:'Outreach' },
    { ic:'deals',  t:'Deal above threshold', d:'Mekong Logistics · $5,200', cls:'badge-warning', tag:'Deal' },
    { ic:'user',   t:'Client asked for a human', d:'Nova Realty Group · $6,400', cls:'badge-danger', tag:'Human' },
    { ic:'dollar', t:'Cost limit warning', d:'AI spend at 86% of today’s budget', cls:'badge-warning', tag:'Cost' },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:120, background:'rgba(20,18,12,.32)', backdropFilter:'blur(2px)', animation:'fade-in .25s' }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:400, maxWidth:'92vw', zIndex:121, background:'var(--surface)', borderLeft:'1px solid var(--border)',
        boxShadow:'var(--sh-xl)', display:'flex', flexDirection:'column', animation:'slide-in .35s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="row between" style={{ padding:'18px 20px', borderBottom:'1px solid var(--border)' }}>
          <div className="row" style={{ gap:10 }}><h2 style={{ fontSize:17 }}>Review center</h2><span style={{ minWidth:20, height:20, padding:'0 6px', borderRadius:99, background:'var(--warning)', color:'#fff', fontSize:11.5, fontWeight:600, display:'grid', placeItems:'center' }}>{items.length}</span></div>
          <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor:'var(--border)' }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:14 }}>
          <div className="col" style={{ gap:10 }}>
            {items.map((it,i)=>(
              <div key={i} style={{ padding:14, borderRadius:13, border:'1px solid var(--border)' }}>
                <div className="row between" style={{ marginBottom:9 }}>
                  <span style={{ width:32, height:32, borderRadius:9, background:'var(--surface-muted)', color:'var(--ink-2)', display:'grid', placeItems:'center' }}><Icon name={it.ic} size={16}/></span>
                  <span className={'badge '+it.cls} style={{ height:19, fontSize:10.5 }}>{it.tag}</span>
                </div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:3 }}>{it.t}</div>
                <div style={{ fontSize:12.5, color:'var(--ink-3)', marginBottom:11 }}>{it.d}</div>
                <div className="row" style={{ gap:8 }}>
                  <button className="btn btn-primary btn-sm grow" onClick={()=>{onAction('Approved · '+it.t,'success');}}>Approve</button>
                  <button className="btn btn-ghost btn-sm grow" onClick={()=>{onAction('Opened · '+it.t);}} style={{ borderColor:'var(--border)' }}>Open</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  const LS = (k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
  const [theme, toggleTheme] = useTheme();
  const [route, setRoute] = useState(()=> localStorage.getItem('av-route') || 'landing');
  const [param, setParam] = useState(()=> localStorage.getItem('av-param') || null);
  const go = (r, p = null) => { setRoute(r); setParam(p); setMobileNav(false); localStorage.setItem('av-route', r); if(p) localStorage.setItem('av-param', p); else localStorage.removeItem('av-param'); };
  const [mode, setMode] = useState(()=> localStorage.getItem('av-mode') || 'guarded');
  useEffect(()=>{ localStorage.setItem('av-mode', mode); }, [mode]);
  const [lang, setLang] = useState(() => localStorage.getItem('av-lang') || 'en');
  window.__lang = lang;
  useEffect(() => { window.__setLang = (l) => { localStorage.setItem('av-lang', l); setLang(l); }; }, []);
  const [authed, setAuthed] = useState(()=> localStorage.getItem('av-auth')==='1');
  const [user, setUser] = useState(()=> localStorage.getItem('av-user') || 'founder@agentsverse.ai');
  const login = (email) => { localStorage.setItem('av-auth','1'); localStorage.setItem('av-user', email); setUser(email); setAuthed(true); go('overview'); };
  const logout = () => { localStorage.removeItem('av-auth'); setAuthed(false); go('landing'); };
  const enter = () => go(authed ? 'overview' : 'login');
  const [palette, setPalette] = useState(false);
  const [review, setReview] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toasts, pushToast] = useToasts();
  const [requests, setRequests] = useState(() => LS('av-requests', AV.demoRequests));
  useEffect(()=>{ localStorage.setItem('av-requests', JSON.stringify(requests)); }, [requests]);
  const [reqOpen, setReqOpen] = useState(false);
  const addRequest = (data) => setRequests(x => [{ ...data, id:'rq'+Date.now(), t:'just now', status:'new', city: data.city||'—' }, ...x]);
  const newReq = requests.filter(r => r.status==='new').length;
  const badges = { command: 3, requests: newReq || undefined };
  // shared leads (so converting a request adds a real pipeline lead)
  const [leads, setLeads] = useState(() => LS('av-leads', AV.leads));
  useEffect(()=>{ localStorage.setItem('av-leads', JSON.stringify(leads)); }, [leads]);
  const addLead = (r) => setLeads(x => x.find(l=>l.company===r.business) ? x : [{ id:'lead-'+Date.now(), company:r.business, industry:r.industry, city:r.city||'—', url:r.url||'(no site yet)', site:38, score:84, value:2400, agent:'vega', stage:'audited', demo:'draft' }, ...x]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p=>!p); }
      if (e.key === 'Escape') { setPalette(false); setReview(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // reset scroll on route change
  useEffect(() => { window.scrollTo(0,0); const el=document.getElementById('app-scroll'); if(el) el.scrollTop=0; }, [route, param]);

  if (route === 'landing') {
    return (
      <>
        <LandingPage theme={theme} onToggle={toggleTheme} onEnter={enter} onRequestDemo={()=>setReqOpen(true)} onNav={(r)=>go(r)} />
        <ToastHost toasts={toasts} />
        <ChatWidget />
        <DemoRequestModal open={reqOpen} onClose={()=>setReqOpen(false)} onSubmit={addRequest} onAction={pushToast} />
      </>
    );
  }

  if (window.INFO_PAGES && window.INFO_PAGES.includes(route)) {
    return (
      <>
        <InfoPage page={route} theme={theme} onToggle={toggleTheme} onEnter={enter} onRequestDemo={()=>setReqOpen(true)} onNav={(r)=>go(r)} />
        <ToastHost toasts={toasts} />
        <ChatWidget />
        <DemoRequestModal open={reqOpen} onClose={()=>setReqOpen(false)} onSubmit={addRequest} onAction={pushToast} />
      </>
    );
  }

  // workspace auth gate
  if (route === 'login' || !authed) {
    return <LoginScreen onLogin={login} onBack={()=>go('landing')} theme={theme} onToggle={toggleTheme} />;
  }

  const meta = ROUTE_META[route] || { label: route };
  let crumbs = ['Agents Verse', meta.label];
  let screen;
  if (route==='overview') screen = <FloorOverview onAction={pushToast} goCommand={()=>go('command')} goRoom={(id)=>go('room',id)} />;
  else if (route==='command') screen = <CommandCenter onAction={pushToast} />;
  else if (route==='rooms') screen = <RoomsIndex onOpen={(id)=>go('room',id)} onAgent={(id)=>go('agent',id)} />;
  else if (route==='room') { const r=AV.roomById(param)||AV.roomById('design'); crumbs=['Agents Verse','Rooms',r.name]; screen=<RoomDetail roomId={param||'design'} onBack={()=>go('rooms')} onAgent={(id)=>go('agent',id)} onAction={pushToast} goDemos={()=>go('demos')} />; }
  else if (route==='agents') screen = <AgentsIndex onOpen={(id)=>go('agent',id)} onRoom={(id)=>go('room',id)} />;
  else if (route==='agent') { const ag=AV.agentById(param)||AV.agentById('nova'); crumbs=['Agents Verse','Agents',ag.name]; screen=<AgentDetail agentId={param||'nova'} onBack={()=>go('agents')} onRoom={(id)=>go('room',id)} onAction={pushToast} />; }
  else if (route==='leads') screen = <LeadPipeline onAction={pushToast} onOpenAudit={(id)=>go('audits',id)} onOpenDemo={(id)=>go('demos',id)} leads={leads} />;
  else if (route==='audits') screen = <AuditScreen initialLead={param} onAction={pushToast} goDemos={(id)=>go('demos',id)} goLead={()=>go('leads')} />;
  else if (route==='demos') screen = <DemoManager initialLead={param} onAction={pushToast} />;
  else if (route==='deals') screen = <DealsScreen onAction={pushToast} initialLead={param} />;
  else if (route==='settings') screen = <SettingsScreen mode={mode} setMode={setMode} onAction={pushToast} />;
  else if (route==='activity') screen = <ActivityScreen onAction={pushToast} goAgent={(id)=>go('agent',id)} goRoom={(id)=>go('room',id)} />;
  else if (route==='requests') screen = <RequestsScreen requests={requests} setRequests={setRequests} onAction={pushToast} goLead={()=>go('leads')} onConvertLead={addLead} />;
  else screen = <ComingSoon route={route} onBack={()=>go('overview')} />;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <Sidebar route={route==='room'?'rooms':route==='agent'?'agents':route} onNav={(r)=>go(r)} mode={mode} setMode={setMode} onLanding={()=>go('landing')} badges={badges} mobileOpen={mobileNav} onClose={()=>setMobileNav(false)} onLogout={logout} user={user} />
      {mobileNav && <div className="av-backdrop hide-desktop" onClick={()=>setMobileNav(false)} style={{ position:'fixed', inset:0, zIndex:129, background:'rgba(20,18,12,.4)', backdropFilter:'blur(2px)' }} />}
      <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
        <TopBar crumbs={crumbs} mode={mode} theme={theme} onToggle={toggleTheme}
          onSearch={()=>setPalette(true)} onReview={()=>setReview(true)} onMenu={()=>setMobileNav(true)} />
        <main id="app-scroll" style={{ flex:1, minWidth:0 }}>{screen}</main>
      </div>
      <CommandPalette open={palette} onClose={()=>setPalette(false)} onNav={(r)=>go(r)} />
      <ReviewCenter open={review} onClose={()=>setReview(false)} onAction={pushToast} />
      <ToastHost toasts={toasts} />
      <ChatWidget />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
