/* =========================================================================
   AGENTS VERSE — DemoRequestModal
   Extracted from requests.jsx. Persists submissions to localStorage key
   'av-requests' (forward-compatible with the admin inbox in Set 2).
   On submit: prepends a new entry and flips to the success screen — no toast,
   matching the original modal, which never fired one on the public form.
   ========================================================================= */
'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/brand/icon';
import { Mark } from '@/components/brand/mark';

interface FormState {
  business: string;
  url: string;
  industry: string;
  name: string;
  email: string;
  message: string;
}

const EMPTY: FormState = { business:'', url:'', industry:'Hospitality', name:'', email:'', message:'' };

export interface DemoRequestModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoRequestModal({ open, onClose }: DemoRequestModalProps) {
  const [done, setDone] = useState(false);
  const [f, setF] = useState<FormState>(EMPTY);

  useEffect(() => { if (open) { setDone(false); setF(EMPTY); } }, [open]);

  if (!open) return null;

  const valid = f.business.trim() && f.name.trim() && /.+@.+\..+/.test(f.email);

  const submit = () => {
    if (!valid) return;

    /* Persist to localStorage av-requests — same shape the admin inbox expects */
    const entry = {
      ...f,
      id: 'rq' + Date.now(),
      t: 'just now',
      status: 'new',
      city: (f as FormState & { city?: string }).city || '—',
    };
    try {
      const existing = JSON.parse(localStorage.getItem('av-requests') || '[]');
      localStorage.setItem('av-requests', JSON.stringify([entry, ...existing]));
    } catch {
      /* localStorage unavailable (private browsing edge case) — continue silently */
    }

    setDone(true);
  };

  const field = (label: string, key: keyof FormState, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
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
