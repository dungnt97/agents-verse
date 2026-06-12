/* =========================================================================
   AGENTS VERSE — Animated count-up (fires when scrolled into view)
   useCountUp: eases from start→end over `dur` ms using cubic ease-out.
   Falls back to snap-to-final after 1700ms to handle throttled rAF
   (background tab / iframe).
   ========================================================================= */
'use client';

import { useState, useEffect, useRef, type CSSProperties, type RefObject } from 'react';

export function useCountUp(
  end: number,
  { dur = 1200, decimals = 0, start = 0 }: { dur?: number; decimals?: number; start?: number } = {}
): [string, RefObject<HTMLElement | null>] {
  const [val, setVal] = useState(start);
  const ref = useRef<HTMLElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      if (done.current) return; done.current = true;
      const t0 = performance.now();
      const tick = (t: number) => {
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

export interface CountUpProps {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  dur?: number;
  className?: string;
  style?: CSSProperties;
}

export function CountUp({ end, decimals = 0, prefix = '', suffix = '', dur = 1200, className, style }: CountUpProps) {
  const [v, ref] = useCountUp(end, { dur, decimals });
  return <span ref={ref as RefObject<HTMLSpanElement>} className={'tabular ' + (className || '')} style={style}>{prefix}{v}{suffix}</span>;
}
