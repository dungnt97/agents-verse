/* =========================================================================
   AGENTS VERSE — Landing page (nav + hero + assembly)
   ========================================================================= */

function LandingNav({ theme, onToggle, onEnter, onRequestDemo }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      transition: 'all .3s ease',
      background: scrolled ? 'color-mix(in oklab, var(--bg) 80%, transparent)' : 'transparent',
      backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
      borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}` }}>
      <div style={{ ...wrap, height: 66, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div className="row"><Logo size={28} /></div>
        <nav className="row hide-mobile" style={{ gap: 4, justifySelf: 'center' }}>
          {[['nav.how','how'],['nav.showcase','showcase'],['nav.pricing','pricing'],['nav.trust','trust']].map(([tk,id]) => (
            <a key={id} href={'#'+id} style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', padding: '8px 13px', borderRadius: 8, cursor:'pointer', whiteSpace:'nowrap' }}
              onClick={(e)=>{ e.preventDefault(); const el=document.getElementById(id); if(el){ window.scrollTo({ top: el.getBoundingClientRect().top+window.scrollY-66, behavior:'smooth' }); } }}
              onMouseEnter={e=>e.currentTarget.style.color='var(--ink)'} onMouseLeave={e=>e.currentTarget.style.color='var(--ink-2)'}>{t(tk)}</a>
          ))}
        </nav>
        <div className="row" style={{ gap: 10, justifySelf: 'end' }}>
          <LangToggle />
          <ThemeToggle theme={theme} onToggle={onToggle} />
          <button className="btn btn-ghost hide-mobile" onClick={onEnter} style={{ borderColor: 'var(--border)' }}>{t('nav.openWorkspace')}</button>
          <button className="btn btn-primary" onClick={onRequestDemo}>{t('nav.requestDemo')}</button>
        </div>
      </div>
    </header>
  );
}

/* ---- Floating status card used in the hero composition ---- */
function FloatCard({ icon, iconColor, iconBg, title, sub, badge, badgeCls, style, delay = 0 }) {
  return (
    <div className="card-elev" style={{ padding: '12px 14px', boxShadow: 'var(--sh-xl)', animation: `float-y 6s ease-in-out ${delay}s infinite`, ...style }}>
      <div className="row" style={{ gap: 11 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, color: iconColor, display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={icon} size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="row between" style={{ gap: 10 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{title}</span>
            {badge && <span className={'badge ' + badgeCls} style={{ height: 19, fontSize: 10.5 }}>{badge}</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1, whiteSpace: 'nowrap' }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 520 }}>
      {/* glow */}
      <div style={{ position: 'absolute', inset: '-8% -4% 10%', borderRadius: 40, zIndex: 0,
        background: 'radial-gradient(60% 60% at 70% 25%, var(--primary-soft), transparent 70%)', filter: 'blur(8px)' }} />

      {/* main product window — the signature floor screen */}
      <div className="card-elev" style={{ position: 'relative', zIndex: 1, padding: 0, overflow: 'hidden', boxShadow: 'var(--sh-xl)',
        transform: 'perspective(1800px) rotateY(-9deg) rotateX(3deg)', transformOrigin: 'right center' }}>
        {/* window chrome */}
        <div className="row between" style={{ height: 42, padding: '0 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-muted)' }}>
          <div className="row" style={{ gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--border-strong)' }} />
            <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--border-strong)' }} />
            <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--border-strong)' }} />
          </div>
          <span className="row" style={{ gap: 7, fontSize: 12, color: 'var(--ink-3)' }}><Logo size={16} mono /> <span className="mono">Floor Overview</span></span>
          <span className="row" style={{ gap: 6, fontSize: 11.5, color: 'var(--ink-3)' }}><span className="pulse" /> 17 online</span>
        </div>
        <div style={{ padding: 16 }}>
          {/* mini metric strip */}
          <div className="row" style={{ gap: 8, marginBottom: 14 }}>
            {[['Scanned','148'],['Demos','12'],['Replies','7'],['Forecast','$8.4k']].map(([l,v],i)=>(
              <div key={i} style={{ flex: 1, padding: '8px 11px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink-3)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }} className="tabular">{v}</div>
              </div>
            ))}
          </div>
          <FloorMap compact height={300} />
        </div>
      </div>

      {/* floating cards */}
      <FloatCard icon="layers" iconColor="var(--primary)" iconBg="var(--primary-soft)"
        title="Demo generated" sub="Lumi Spa Studio · 41 → 92" badge="Approved" badgeCls="badge-success"
        style={{ position: 'absolute', left: -28, top: 150, zIndex: 3, width: 248 }} delay={0} />
      <FloatCard icon="activity" iconColor="var(--info)" iconBg="var(--info-soft)"
        title="Client replied" sub="Nova Realty Group · interested" badge="New" badgeCls="badge-info"
        style={{ position: 'absolute', right: -22, top: 70, zIndex: 3, width: 250 }} delay={1.4} />
      <FloatCard icon="user" iconColor="var(--warning)" iconBg="var(--warning-soft)"
        title="Founder review required" sub="Deal above approval threshold" badge="$5.2k" badgeCls="badge-warning"
        style={{ position: 'absolute', right: 10, bottom: 18, zIndex: 3, width: 252 }} delay={2.6} />
    </div>
  );
}

function Hero({ onEnter, onRequestDemo, onContact }) {
  const stats = [
    { v:148, suffix:'', l:t('stat.scanned') },
    { v:12, suffix:'', l:t('stat.demos') },
    { v:7, suffix:'', l:t('stat.replies') },
    { v:8.4, suffix:'k', prefix:'$', dec:1, l:t('stat.pipeline') },
  ];
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="grain" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -200, left: '-10%', width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, var(--primary-soft) 0%, transparent 65%)', opacity: 0.7, zIndex: 0 }} />
      <div style={{ ...wrap, position: 'relative', zIndex: 1, paddingTop: 142, paddingBottom: 90 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,1fr)', gap: 56, alignItems: 'center' }} className="hero-grid">
          <div>
            <Reveal>
              <div className="row" style={{ gap: 8, marginBottom: 24, padding: '6px 12px 6px 8px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--surface)', width: 'fit-content', boxShadow: 'var(--sh-xs)' }}>
                <span className="pulse" />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{t('hero.badge')}</span>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display" style={{ marginBottom: 22 }}>
                {t('hero.h1a')}<br /><span style={{ color: 'var(--primary)' }}>{t('hero.h1b')}</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p style={{ fontSize: 19.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 520, marginBottom: 32, textWrap: 'pretty' }}>
                {t('hero.sub')}
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="row wrap" style={{ gap: 12, marginBottom: 22 }}>
                <button className="btn btn-primary btn-lg" onClick={onRequestDemo}>{t('hero.cta')} <Icon name="arrowR" size={18} /></button>
                <button className="btn btn-ghost btn-lg" onClick={onContact}>{t('hero.contact')}</button>
              </div>
            </Reveal>
            <Reveal delay={280}>
              <div className="row" style={{ gap: 8, fontSize: 13.5, color: 'var(--ink-3)', marginBottom: 44 }}>
                <Icon name="shield" size={15} /> {t('hero.trust')}
              </div>
            </Reveal>
            <Reveal delay={340}>
              <div className="row wrap" style={{ gap: 0, borderTop: '1px solid var(--border)', paddingTop: 22 }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ paddingRight: 26, marginRight: 26, borderRight: i<stats.length-1?'1px solid var(--border)':'none' }}>
                    <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em' }}>
                      <CountUp end={s.v} decimals={s.dec||0} prefix={s.prefix||''} suffix={s.suffix||''} />
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={200} className="hero-visual-wrap">
            <HeroVisual />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function LandingPage({ theme, onToggle, onEnter, onRequestDemo, onNav }) {
  const rd = onRequestDemo || onEnter;
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <LandingNav theme={theme} onToggle={onToggle} onEnter={onEnter} onRequestDemo={rd} />
      <Hero onEnter={onEnter} onRequestDemo={rd} onContact={()=>onNav && onNav('contact')} />
      <DifferenceSection />
      <HowItWorks />
      <Showcase />
      <InsideCompany />
      <WhyWins />
      <Pricing onRequestDemo={rd} />
      <TrustSafety />
      <FinalCTA onEnter={onEnter} onRequestDemo={rd} onContact={()=>onNav && onNav('contact')} />
      <Footer onEnter={onEnter} onNav={onNav} />
    </div>
  );
}

Object.assign(window, { LandingPage });
