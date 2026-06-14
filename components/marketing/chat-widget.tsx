/* =========================================================================
   AGENTS VERSE — ChatWidget + chatReply
   Rule-based reply logic is pure and static;
   UI state is fully client-side. No server data needed.
   ========================================================================= */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/brand/icon';
import { Mark } from '@/components/brand/mark';

/* Static rule-based reply — no AI call, matches original exactly */
export function chatReply(text: string): string {
  const t = text.toLowerCase();
  if (/approv|review|escalat|attention|need/.test(t))
    return "3 things need you right now:\n• Nova Realty — client asked for a call ($6.4k)\n• Mekong Logistics — quote above your $4k limit ($5.2k)\n• AI cost at 86% of today’s budget\n\nWant me to open the Command Center?";
  if (/demo/.test(t))
    return "12 demos generated today. 1 needs your review (Atlas Dental, 34 → 88) and Lumi Spa is approved and ready to send. Shall I open the Demo Manager?";
  if (/pric|cost|budget|spend|margin/.test(t))
    return "AI cost today is $42.80 of your $50 budget (86%). Revenue forecast is $8.4k at an 81% margin — net projected profit ≈ $6,940.";
  if (/lead|pipeline|deal/.test(t))
    return "43 high-potential leads · $26.6k open pipeline. Your warmest deal is Nova Realty ($6.4k) — it’s waiting on a founder call.";
  if (/summary|today|status|going|how.*we/.test(t))
    return "Today so far: 148 sites scanned, 12 demos generated, 38 outreach messages prepared, 7 client replies, 2 deals won. 3 items need your decision.";
  if (/hi|hello|hey|help/.test(t))
    return "Hi! I’m your Verse assistant. I can summarize the day, surface what needs approval, and point you to leads, demos or deals. What would you like?";
  return "I can review escalations, check demos, track the pipeline, or summarize the day for you. Try one of the suggestions below, or ask me anything.";
}

interface Message {
  role: 'bot' | 'you';
  text: string;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([{ role:'bot', text:"Hi — I’m your Verse assistant. Your agency is running smoothly. Want a quick summary, or shall I show you what needs your attention?" }]);
  const [val, setVal] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, typing, open]);
  useEffect(() => { if (open) setTimeout(()=>inputRef.current&&inputRef.current.focus(), 250); }, [open]);

  const send = (text: string) => {
    const m = (text||'').trim(); if (!m) return;
    setMsgs(x => [...x, { role:'you', text:m }]);
    setVal(''); setTyping(true);
    setTimeout(() => { setTyping(false); setMsgs(x => [...x, { role:'bot', text: chatReply(m) }]); }, 750);
  };
  const suggestions = ['What needs my approval?', 'Summarize today', 'How are demos doing?', 'Pricing & cost'];

  return (
    <div style={{ position:'fixed', right:24, bottom:24, zIndex:160, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:14 }}>
      {/* panel */}
      {open && (
        <div className="card-elev" style={{ width:374, maxWidth:'calc(100vw - 32px)', height:520, maxHeight:'calc(100vh - 130px)', padding:0, overflow:'hidden',
          display:'flex', flexDirection:'column', boxShadow:'var(--sh-xl)', animation:'chat-in .28s cubic-bezier(.2,.8,.2,1)', transformOrigin:'bottom right' }}>
          {/* header */}
          <div className="row between" style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)',
            background:'linear-gradient(180deg, var(--surface-elev), var(--surface))' }}>
            <div className="row" style={{ gap:11 }}>
              <Mark size={34} tile />
              <div>
                <div style={{ fontSize:14.5, fontWeight:600, letterSpacing:'-0.01em' }}>Verse Assistant</div>
                <div className="row" style={{ gap:6 }}><span className="pulse" style={{ background:'var(--success)' }} /><span style={{ fontSize:11.5, color:'var(--ink-3)' }}>Always on · guardrailed</span></div>
              </div>
            </div>
            <button className="btn btn-icon btn-ghost focusable" onClick={()=>setOpen(false)} style={{ borderColor:'var(--border)', width:32, height:32 }} aria-label="Minimize"><Icon name="minus" size={16} /></button>
          </div>
          {/* messages */}
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:11, background:'var(--surface)' }}>
            {msgs.map((m,i)=>(
              <div key={i} className="row" style={{ gap:9, alignItems:'flex-end', flexDirection: m.role==='you'?'row-reverse':'row', alignSelf: m.role==='you'?'flex-end':'flex-start', maxWidth:'90%' }}>
                {m.role==='bot' && <Mark size={24} tile />}
                <div style={{ padding:'10px 13px', borderRadius:14, fontSize:13.5, lineHeight:1.5, whiteSpace:'pre-line',
                  background: m.role==='you'?'var(--primary)':'var(--surface-muted)', color: m.role==='you'?'#fff':'var(--ink)',
                  borderBottomRightRadius: m.role==='you'?4:14, borderBottomLeftRadius: m.role==='you'?14:4 }}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="row" style={{ gap:9, alignItems:'flex-end' }}>
                <Mark size={24} tile />
                <div style={{ padding:'12px 14px', borderRadius:14, borderBottomLeftRadius:4, background:'var(--surface-muted)', display:'flex', gap:4 }}>
                  {[0,1,2].map(i=><span key={i} style={{ width:6, height:6, borderRadius:99, background:'var(--ink-3)', animation:`typing 1.2s ${i*0.16}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>
          {/* suggestions + input */}
          <div style={{ padding:'10px 14px 14px', borderTop:'1px solid var(--border)' }}>
            {msgs.length<=1 && (
              <div className="row" style={{ gap:6, flexWrap:'wrap', marginBottom:11 }}>
                {suggestions.map(s=>(<button key={s} onClick={()=>send(s)} className="chip" style={{ height:28, fontSize:11.5 }}>{s}</button>))}
              </div>
            )}
            <div className="row" style={{ gap:8 }}>
              <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send(val)}
                placeholder="Ask your assistant…" style={{ flex:1, height:40, padding:'0 14px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface)', fontSize:13.5, color:'var(--ink)', outline:'none' }} />
              <button className="btn btn-primary btn-icon" style={{ width:40, height:40 }} onClick={()=>send(val)} aria-label="Send"><Icon name="send" size={17} /></button>
            </div>
          </div>
        </div>
      )}
      {/* launcher */}
      <button onClick={()=>setOpen(o=>!o)} className="focusable" aria-label="Open assistant" style={{
        width:58, height:58, borderRadius:'50%', flex:'none', position:'relative',
        background:'linear-gradient(155deg, #f8972f, #e85f17)', color:'#fff', display:'grid', placeItems:'center',
        boxShadow:'0 8px 24px rgba(232,99,28,.45), inset 0 1px 0 rgba(255,255,255,.3)',
        transition:'transform .2s cubic-bezier(.2,.8,.2,1)', transform: open?'scale(.92)':'scale(1)' }}
        onMouseEnter={e=>e.currentTarget.style.transform=open?'scale(.92)':'scale(1.06)'} onMouseLeave={e=>e.currentTarget.style.transform=open?'scale(.92)':'scale(1)'}>
        <Icon name={open?'chevD':'chat'} size={open?22:24} sw={2.2} />
        {!open && <span style={{ position:'absolute', top:2, right:2, width:13, height:13, borderRadius:99, background:'var(--danger)', border:'2px solid var(--surface)' }} />}
      </button>
    </div>
  );
}
