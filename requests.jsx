/* =========================================================================
   AGENTS VERSE — Demo Request modal (public) + Requests inbox (admin)
   ========================================================================= */

function DemoRequestModal({ open, onClose, onSubmit, onAction }) {
  const [done, setDone] = useState(false);
  const [f, setF] = useState({ business:'', url:'', industry:'Hospitality', name:'', email:'', message:'' });
  useEffect(() => { if (open) { setDone(false); setF({ business:'', url:'', industry:'Hospitality', name:'', email:'', message:'' }); } }, [open]);
  if (!open) return null;
  const valid = f.business.trim() && f.name.trim() && /.+@.+\..+/.test(f.email);
  const submit = () => {
    if (!valid) return;
    onSubmit && onSubmit(f);
    setDone(true);
  };
  const field = (label, key, props={}) => (
    <label style={{ display:'block' }}>
      <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink-2)', display:'block', marginBottom:6 }}>{label}</span>
      <input value={f[key]} onChange={e=>setF(s=>({...s,[key]:e.target.value}))} {...props}
        style={{ width:'100%', height:42, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--ink)', outline:'none' }} />
    </label>
  );

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:320, background:'rgba(20,15,8,.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, animation:'fade-in .25s' }}>
      <div onClick={e=>e.stopPropagation()} className="card-elev" style={{ width:520, maxWidth:'100%', maxHeight:'90vh', overflow:'auto', padding:0, boxShadow:'var(--sh-xl)', animation:'chat-in .3s cubic-bezier(.2,.8,.2,1)' }}>
        {!done ? (
          <>
            <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid var(--border)' }}>
              <div className="row between">
                <span className="row" style={{ gap:11 }}><Mark size={34} tile /><span style={{ fontSize:13, fontWeight:600, color:'var(--ink-3)' }} className="mono">FREE WORKING DEMO</span></span>
                <button className="btn btn-icon btn-ghost focusable" onClick={onClose} style={{ borderColor:'var(--border)', width:32, height:32 }}><Icon name="x" size={16} /></button>
              </div>
              <h2 style={{ fontSize:24, letterSpacing:'-0.03em', marginTop:14, marginBottom:8 }}>See your new website first.</h2>
              <p style={{ fontSize:14.5, color:'var(--ink-2)', lineHeight:1.5 }}>Tell us about your business. We’ll audit your current site and send back a working redesign demo — free, no obligation.</p>
            </div>
            <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {field('Business name *','business',{placeholder:'Atlas Dental Clinic'})}
                <label style={{ display:'block' }}>
                  <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink-2)', display:'block', marginBottom:6 }}>Industry</span>
                  <select value={f.industry} onChange={e=>setF(s=>({...s,industry:e.target.value}))} style={{ width:'100%', height:42, padding:'0 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--ink)' }}>
                    {['Hospitality','Healthcare','Wellness','Real Estate','Fitness','Automotive','Home Services','Retail','Other'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </label>
              </div>
              {field('Current website (optional)','url',{placeholder:'yourbusiness.com — or leave blank if none'})}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {field('Your name *','name',{placeholder:'Jane Doe'})}
                {field('Email *','email',{placeholder:'you@business.com', type:'email'})}
              </div>
              <label style={{ display:'block' }}>
                <span style={{ fontSize:12.5, fontWeight:600, color:'var(--ink-2)', display:'block', marginBottom:6 }}>Anything specific? (optional)</span>
                <textarea value={f.message} onChange={e=>setF(s=>({...s,message:e.target.value}))} rows={3} placeholder="What would you love your new site to do?"
                  style={{ width:'100%', padding:'11px 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:14, color:'var(--ink)', outline:'none', resize:'vertical', fontFamily:'var(--font-sans)' }} />
              </label>
            </div>
            <div className="row between" style={{ padding:'16px 24px', borderTop:'1px solid var(--border)', gap:12 }}>
              <span className="row" style={{ gap:7, fontSize:12, color:'var(--ink-3)' }}><Icon name="shield" size={14}/> No spam. We only reach out about your demo.</span>
              <button className="btn btn-primary btn-lg" disabled={!valid} onClick={submit} style={{ opacity: valid?1:0.5, cursor: valid?'pointer':'not-allowed' }}>Request my free demo <Icon name="arrowR" size={17}/></button>
            </div>
          </>
        ) : (
          <div style={{ padding:'44px 32px', textAlign:'center' }}>
            <div style={{ width:64, height:64, borderRadius:18, margin:'0 auto 22px', display:'grid', placeItems:'center', background:'var(--success-soft)', color:'var(--success)' }}><Icon name="check" size={32} sw={2.4} /></div>
            <h2 style={{ fontSize:24, letterSpacing:'-0.03em', marginBottom:12 }}>Request received.</h2>
            <p style={{ fontSize:15.5, color:'var(--ink-2)', lineHeight:1.55, maxWidth:380, margin:'0 auto 26px' }}>
              Our research room is already on it. We’ll audit <strong style={{color:'var(--ink)'}}>{f.business||'your site'}</strong> and send a working demo to <strong style={{color:'var(--ink)'}}>{f.email}</strong> within 48 hours.
            </p>
            <button className="btn btn-primary btn-lg" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- ADMIN REQUESTS INBOX ---------------------------- */
function RequestCard({ r, onAction, onConvert, onUpdate }) {
  const st = AV.REQ_STATUS[r.status];
  const hue = AV.hueFor(r.industry);
  return (
    <div className="card" style={{ padding:'16px 18px', borderColor: r.status==='new'?'color-mix(in oklab,var(--warning) 35%, var(--border))':'var(--border)' }}>
      <div className="row between" style={{ marginBottom:11 }}>
        <span className="row" style={{ gap:12, minWidth:0 }}>
          <span style={{ width:40, height:40, borderRadius:11, background:`oklch(0.62 0.13 ${hue} / .16)`, display:'grid', placeItems:'center', flex:'none' }}><span style={{ width:10, height:10, borderRadius:99, background:`oklch(0.6 0.15 ${hue})` }} /></span>
          <span style={{ minWidth:0 }}>
            <div style={{ fontSize:15.5, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.business}</div>
            <div style={{ fontSize:12.5, color:'var(--ink-3)' }}>{r.industry} · {r.city} · {r.t}</div>
          </span>
        </span>
        <span className={'badge '+st.cls}>{r.status==='new'&&<span className="dot" style={{background:'currentColor'}}/>}{st.label}</span>
      </div>
      <p style={{ fontSize:13.5, color:'var(--ink-2)', lineHeight:1.5, marginBottom:13, padding:'11px 13px', background:'var(--surface-muted)', borderRadius:10 }}>“{r.message}”</p>
      <div className="row between" style={{ marginBottom:14, flexWrap:'wrap', gap:8 }}>
        <span className="row" style={{ gap:8, minWidth:0 }}><Icon name="user" size={14} style={{color:'var(--ink-3)'}}/><span style={{ fontSize:13, fontWeight:500 }}>{r.name}</span><span className="mono" style={{ fontSize:12, color:'var(--ink-3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.email}</span></span>
        {r.url ? <span className="row mono" style={{ gap:5, fontSize:11.5, color:'var(--ink-3)' }}>{r.url} <Icon name="external" size={11}/></span> : <span className="badge badge-neutral" style={{height:19,fontSize:10.5}}>No site yet</span>}
      </div>
      <div className="row" style={{ gap:8, flexWrap:'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={()=>{ onConvert(r); }}>Run audit & convert</button>
        <button className="btn btn-ghost btn-sm" style={{borderColor:'var(--border)'}} onClick={()=>{ onUpdate(r.id,'contacted'); onAction('Reply sent to '+r.name,'success'); }}>Reply</button>
        {r.status!=='declined' && <button className="btn btn-soft btn-sm" style={{marginLeft:'auto'}} onClick={()=>{ onUpdate(r.id,'declined'); onAction('Request declined','warning'); }}>Decline</button>}
      </div>
    </div>
  );
}

function RequestsScreen({ requests, setRequests, onAction, goLead, onConvertLead }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const filters = ['All','New','Reviewing','Contacted','Converted'];
  const list = requests.filter(r =>
    (filter==='All' || AV.REQ_STATUS[r.status].label===filter) &&
    (r.business+r.name+r.email+r.industry).toLowerCase().includes(q.toLowerCase())
  );
  const c = (s)=>requests.filter(r=>r.status===s).length;
  const update = (id,status)=> setRequests(x=>x.map(r=>r.id===id?{...r,status}:r));
  const convert = (r)=>{ update(r.id,'converted'); if(onConvertLead) onConvertLead(r); onAction('Converting '+r.business+' → audit started','success'); setTimeout(()=>goLead&&goLead(),500); };

  return (
    <div style={{ padding:'26px 28px 60px', maxWidth:1180, margin:'0 auto' }}>
      <div className="row between wrap" style={{ gap:16, marginBottom:22 }}>
        <div>
          <div className="row" style={{ gap:11, marginBottom:6 }}><h1 style={{ fontSize:28, letterSpacing:'-0.03em' }}>{t('req.title')}</h1>{c('new')>0 && <span className="badge badge-warning" style={{height:24}}><span className="dot" style={{background:'currentColor'}}/>{c('new')} {t('common.new')}</span>}</div>
          <p style={{ fontSize:15, color:'var(--ink-2)' }}>{t('req.sub')}</p>
        </div>
      </div>
      <OverviewBand items={[
        { label:'Total requests', value:requests.length, icon:'send' },
        { label:'New', value:c('new'), icon:'alert', accent:'var(--warning)' },
        { label:'Reviewing', value:c('reviewing'), icon:'search', accent:'var(--info)' },
        { label:'Contacted', value:c('contacted'), icon:'activity', accent:'var(--primary)' },
        { label:'Converted', value:c('converted'), icon:'check', accent:'var(--success)' },
        { label:'Conversion', value:requests.length?Math.round(c('converted')/requests.length*100):0, suffix:'%', icon:'arrowUR', accent:'var(--success)' },
      ]} />
      <div className="row between wrap" style={{ gap:12, marginBottom:20 }}>
        <div className="row" style={{ gap:6, flexWrap:'wrap' }}>{filters.map(f=><button key={f} className={'chip'+(filter===f?' active':'')} onClick={()=>setFilter(f)} style={{height:36}}>{f}</button>)}</div>
        <div className="row" style={{ gap:9, height:38, padding:'0 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', width:230, maxWidth:'70vw' }}>
          <Icon name="search" size={16} style={{ color:'var(--ink-3)' }} />
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search requests…" style={{ border:'none', outline:'none', background:'transparent', fontSize:13.5, width:'100%', color:'var(--ink)' }} />
        </div>
      </div>
      {list.length===0
        ? <EmptyState icon="send" title="No requests here" sub="When a business requests a demo from your landing page, it lands here for review." />
        : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:16 }}>
            {list.map(r => <RequestCard key={r.id} r={r} onAction={onAction} onConvert={convert} onUpdate={update} />)}
          </div>}
    </div>
  );
}

Object.assign(window, { DemoRequestModal, RequestsScreen, RequestCard });
