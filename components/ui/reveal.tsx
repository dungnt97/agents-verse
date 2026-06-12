/* =========================================================================
   AGENTS VERSE — Reveal on scroll
   Wraps children in a div (or custom tag) that fades+slides in when
   it enters the viewport. Falls back to visible after 700ms.
   ========================================================================= */
'use client';

import { useRef, useState, useEffect, type ReactNode, type CSSProperties, type ElementType } from 'react';

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function Reveal({ children, delay = 0, y = 16, as = 'div', className, style }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
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
