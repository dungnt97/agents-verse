/* =========================================================================
   AGENTS VERSE — ChatWidget + chatReply
   Q&A assistant: streams real replies from /api/chat (Claude via the gateway) when configured, and
   falls back to the static rule-based `chatReply` below when it isn't (demo mode) or on error. UI state
   is fully client-side. The assistant answers questions only — it never does work for the user.
   ========================================================================= */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/brand/icon';
import { Mark } from '@/components/brand/mark';

/* Static rule-based reply — the offline fallback used when the live assistant gateway isn't configured. */
export function chatReply(text: string): string {
  const t = text.toLowerCase();
  if (/approv|review|escalat|attention|need/.test(t))
    return "Open the Command Center — it lists everything waiting on your approval right now.";
  if (/demo/.test(t))
    return "Open the Demo Manager to review the demos that have been generated.";
  if (/pric|cost|budget|spend|margin/.test(t))
    return "Your AI cost, daily budget and package pricing all live in Settings and the Command Center.";
  if (/lead|pipeline|deal/.test(t))
    return "Open Leads for the current pipeline, or Deals for what is in play.";
  if (/summary|today|status|going|how.*we/.test(t))
    return "Check the Overview for today\u2019s live activity and metrics.";
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
  const [msgs, setMsgs] = useState<Message[]>([{ role:'bot', text:"Hi — I’m your Verse assistant. Want a quick summary, or shall I show you what needs your attention?" }]);
  const [val, setVal] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, typing, open]);
  useEffect(() => { if (open) setTimeout(()=>inputRef.current&&inputRef.current.focus(), 250); }, [open]);

  const send = (text: string) => {
    const m = (text || '').trim();
    if (!m) return;
    // Snapshot the prior transcript (for the model) before optimistically appending the user's message.
    const history = msgs.map(x => ({ role: x.role === 'you' ? 'user' : 'assistant', content: x.text }));
    setMsgs(x => [...x, { role: 'you', text: m }]);
    setVal('');
    setTyping(true);
    void streamReply(m, history);
  };

  // Stream a real assistant reply from /api/chat (token-by-token). Falls back to the built-in rule-based
  // reply when the gateway isn't configured (demo mode → 503) or on a connection error — the widget
  // always answers. A mid-stream error keeps whatever already streamed.
  const streamReply = async (m: string, history: { role: string; content: string }[]) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [...history, { role: 'user', content: m }] }),
      });
      if (!res.ok || !res.body) {
        setTyping(false);
        setMsgs(x => [...x, { role: 'bot', text: chatReply(m) }]);
        return;
      }
      setTyping(false);
      setMsgs(x => [...x, { role: 'bot', text: '' }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setMsgs(x => { const y = [...x]; y[y.length - 1] = { role: 'bot', text: acc }; return y; });
        }
      } catch {
        /* mid-stream drop — keep the partial reply already shown */
      }
      if (!acc.trim()) {
        setMsgs(x => { const y = [...x]; y[y.length - 1] = { role: 'bot', text: chatReply(m) }; return y; });
      }
    } catch {
      // Initial connection failed (no bot bubble added yet) → rule-based fallback.
      setTyping(false);
      setMsgs(x => [...x, { role: 'bot', text: chatReply(m) }]);
    }
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
