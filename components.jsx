/* =========================================================================
   AGENTS VERSE — Shared components & hooks
   ========================================================================= */
const { useState, useEffect, useRef, useCallback } = React;

/* ---- Theme ---- */
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('av-theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('av-theme', theme);
  }, [theme]);
  return [theme, () => setTheme(t => t === 'light' ? 'dark' : 'light')];
}

function ThemeToggle({ theme, onToggle, compact }) {
  return (
    <button className="btn btn-icon btn-ghost focusable" onClick={onToggle} aria-label="Toggle theme"
      style={{ borderColor: 'var(--border)' }}>
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={17} />
    </button>
  );
}

/* ---- Animated count-up (fires when scrolled into view) ---- */
function useCountUp(end, { dur = 1200, decimals = 0, start = 0 } = {}) {
  const [val, setVal] = useState(start);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (done.current) return; done.current = true;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setVal(start + (end - start) * e);
        if (p < 1) requestAnimationFrame(tick);
        else setVal(end);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => es.forEach(e => e.isIntersecting && run()), { threshold: 0.3 });
    io.observe(el);
    const fallback = setTimeout(run, 500);
    // hard guarantee: snap to final value even if rAF is throttled (background tab/iframe)
    const guarantee = setTimeout(() => setVal(end), 1700);
    return () => { io.disconnect(); clearTimeout(fallback); clearTimeout(guarantee); };
  }, [end]);
  const display = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString('en-US');
  return [display, ref];
}

function CountUp({ end, decimals = 0, prefix = '', suffix = '', dur = 1200, className, style }) {
  const [v, ref] = useCountUp(end, { dur, decimals });
  return <span ref={ref} className={'tabular ' + (className || '')} style={style}>{prefix}{v}{suffix}</span>;
}

/* ---- Status badge ---- */
function StatusBadge({ status, sm }) {
  const m = AV.statusMap[status] || AV.statusMap.idle;
  const live = status === 'working' || status === 'active';
  return (
    <span className={'badge ' + m.cls} style={sm ? { height: 21, fontSize: 11.5 } : null}>
      {live ? <span className="pulse" style={{ width: 6, height: 6, background: m.dot }} /> : <span className="dot" style={{ background: m.dot }} />}
      {m.label}
    </span>
  );
}

/* ---- Agent avatar — abstract geometric identity (no robot clichés) ---- */
function AgentAvatar({ id, size = 36, ring }) {
  const a = AV.agentById(id) || { name: '?', hue: 220, status: 'idle' };
  const h = a.hue;
  const sm = AV.statusMap[a.status];
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <span style={{
        width: size, height: size, borderRadius: '32%', display: 'grid', placeItems: 'center',
        background: `linear-gradient(145deg, oklch(0.68 0.13 ${h}), oklch(0.5 0.16 ${h}))`,
        color: '#fff', fontWeight: 600, fontSize: size * 0.4, letterSpacing: '-0.02em',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.3), 0 1px 3px oklch(0.4 0.12 ${h} / .4)`,
        border: ring ? '2px solid var(--surface)' : 'none',
      }}>{a.name[0]}</span>
      {(a.status === 'working' || a.status === 'active') && (
        <span style={{ position: 'absolute', right: -1, bottom: -1, width: size * 0.28, height: size * 0.28, minWidth: 9, minHeight: 9,
          borderRadius: 99, background: sm.dot, border: '2px solid var(--surface)' }} />
      )}
    </span>
  );
}

function AvatarStack({ ids, size = 26, max = 4 }) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;
  return (
    <span className="row" style={{ paddingLeft: 6 }}>
      {shown.map((id, i) => (
        <span key={id} style={{ marginLeft: -6, zIndex: shown.length - i }}><AgentAvatar id={id} size={size} ring /></span>
      ))}
      {extra > 0 && (
        <span style={{ marginLeft: -6, width: size, height: size, borderRadius: '32%', background: 'var(--surface-muted)',
          border: '2px solid var(--surface)', display: 'grid', placeItems: 'center', fontSize: size * 0.36, fontWeight: 600, color: 'var(--ink-2)' }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

/* ---- Confidence ring ---- */
function ConfidenceRing({ value, size = 44, sw = 4, label }) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  const col = value >= 85 ? 'var(--success)' : value >= 75 ? 'var(--warning)' : 'var(--danger)';
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(value), 120); return () => clearTimeout(t); }, [value]);
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-grid', placeItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--surface-sunk)" strokeWidth={sw} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (shown/100)*c} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      {label !== false && <span className="tabular" style={{ position: 'absolute', fontSize: size * 0.27, fontWeight: 600 }}>{value}</span>}
    </span>
  );
}

/* ---- Sparkline ---- */
function Sparkline({ data, w = 92, h = 30, color = 'var(--primary)', fill = true }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1;
  const pts = data.map((d, i) => [ (i/(data.length-1))*w, h - ((d-min)/rng)*(h-4) - 2 ]);
  const line = pts.map((p,i) => (i?'L':'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  const gid = 'sg' + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
      {fill && <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.22" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ---- Reveal on scroll wrapper ---- */
function Reveal({ children, delay = 0, y = 16, as = 'div', className, style }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }), { threshold: 0.15 });
    io.observe(el);
    const fallback = setTimeout(() => { setVis(true); io.disconnect(); }, 700);
    return () => { io.disconnect(); clearTimeout(fallback); };
  }, []);
  const Tag = as;
  return <Tag ref={ref} className={className} style={{
    ...style, opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`,
    transition: `opacity .7s cubic-bezier(.2,.7,.2,1) ${delay}ms, transform .7s cubic-bezier(.2,.7,.2,1) ${delay}ms`,
  }}>{children}</Tag>;
}

/* ---- Toast ---- */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, kind = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3400);
  }, []);
  return [toasts, push];
}
function ToastHost({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      {toasts.map(t => (
        <div key={t.id} className="card-elev row" style={{
          gap: 11, padding: '12px 15px', minWidth: 240, maxWidth: 360, animation: 'fade-up .35s cubic-bezier(.2,.8,.2,1)',
          borderColor: t.kind === 'warning' ? 'var(--warning)' : t.kind === 'danger' ? 'var(--danger)' : 'var(--border)',
        }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', flex: 'none',
            background: t.kind === 'warning' ? 'var(--warning-soft)' : t.kind === 'danger' ? 'var(--danger-soft)' : 'var(--success-soft)',
            color: t.kind === 'warning' ? 'var(--warning)' : t.kind === 'danger' ? 'var(--danger)' : 'var(--success)' }}>
            <Icon name={t.kind === 'warning' ? 'alert' : 'check'} size={15} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { useTheme, ThemeToggle, useCountUp, CountUp, StatusBadge, AgentAvatar, AvatarStack, ConfidenceRing, Sparkline, Reveal, useToasts, ToastHost });
