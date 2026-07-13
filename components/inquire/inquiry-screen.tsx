'use client';

import { useState, useRef, useEffect } from 'react';
import { Mark } from '@/components/brand/mark';
import { Icon } from '@/components/brand/icon';
import { createDemoInquiry } from '@/lib/actions/create-demo-inquiry';

// The public inquiry page: a prospect who liked their demo chats about it (light qualification, never a
// price) and/or leaves their requirements for the founder to review in /requests. Speaks the CLIENT's market
// language (not a UI toggle), so the copy is a two-entry map keyed by that language.

type Lang = 'English' | 'Vietnamese';
interface Copy {
  heading: (c: string | null) => string;
  sub: string; chatTitle: string; greeting: (c: string | null) => string;
  placeholder: string; chatOff: string;
  formTitle: string; name: string; contact: string; requirements: string; budget: string; timeline: string;
  submit: string; sending: string; thanks: string; needSomething: string;
}
const COPY: Record<Lang, Copy> = {
  English: {
    heading: (c) => (c ? `Like your new website, ${c}?` : 'Like your new website?'),
    sub: 'Chat with us about the design, or leave your details and the team will follow up.',
    chatTitle: 'Ask about your redesign',
    greeting: (c) => `Hi${c ? ` ${c}` : ''}! What do you think of the redesign — and is there anything you'd want changed? I can also pass your budget and timeline to the team.`,
    placeholder: 'Type your message…',
    chatOff: 'Live chat is offline right now — please leave your details below and the team will reach out.',
    formTitle: 'Leave your details',
    name: 'Your name', contact: 'Email or phone', requirements: 'What would you like? (changes, questions…)',
    budget: 'Rough budget (optional)', timeline: 'Timeline (optional)',
    submit: 'Send to the team', sending: 'Sending…',
    thanks: 'Thank you — the team will be in touch shortly.',
    needSomething: 'Please add a message or your contact.',
  },
  Vietnamese: {
    heading: (c) => (c ? `Anh/chị thích website mới chứ, ${c}?` : 'Anh/chị thích website mới chứ?'),
    sub: 'Trò chuyện với chúng tôi về bản thiết kế, hoặc để lại thông tin — đội ngũ sẽ liên hệ lại.',
    chatTitle: 'Hỏi về bản redesign của bạn',
    greeting: (c) => `Xin chào${c ? ` ${c}` : ''}! Anh/chị thấy bản redesign thế nào — có muốn chỉnh gì không? Em cũng có thể ghi lại ngân sách và thời gian mong muốn để chuyển cho đội ngũ.`,
    placeholder: 'Nhập tin nhắn…',
    chatOff: 'Chat trực tiếp đang tạm ngưng — anh/chị để lại thông tin bên dưới, đội ngũ sẽ liên hệ lại nhé.',
    formTitle: 'Để lại thông tin',
    name: 'Tên của bạn', contact: 'Email hoặc số điện thoại', requirements: 'Anh/chị muốn gì? (chỉnh sửa, câu hỏi…)',
    budget: 'Ngân sách dự kiến (không bắt buộc)', timeline: 'Thời gian mong muốn (không bắt buộc)',
    submit: 'Gửi cho đội ngũ', sending: 'Đang gửi…',
    thanks: 'Cảm ơn anh/chị — đội ngũ sẽ liên hệ lại sớm.',
    needSomething: 'Vui lòng thêm tin nhắn hoặc thông tin liên hệ.',
  },
};

interface Msg { role: 'bot' | 'you'; text: string }

export function InquiryScreen({ leadId, company, language }: { leadId: string; company: string | null; language: string }) {
  const t = COPY[language === 'Vietnamese' ? 'Vietnamese' : 'English'];
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'bot', text: t.greeting(company) }]);
  const [val, setVal] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({ name: '', contact: '', requirements: '', budget: '', timeline: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formErr, setFormErr] = useState('');

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, typing]);

  const send = (text: string) => {
    const m = (text || '').trim();
    if (!m) return;
    const history = msgs.map((x) => ({ role: x.role === 'you' ? 'user' : 'assistant', content: x.text }));
    setMsgs((x) => [...x, { role: 'you', text: m }]);
    setVal('');
    setTyping(true);
    void stream(m, history);
  };

  const stream = async (m: string, history: { role: string; content: string }[]) => {
    try {
      const res = await fetch('/api/inquire-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ leadId, messages: [...history, { role: 'user', content: m }] }),
      });
      if (!res.ok || !res.body) {
        setTyping(false);
        setMsgs((x) => [...x, { role: 'bot', text: t.chatOff }]);
        return;
      }
      setTyping(false);
      setMsgs((x) => [...x, { role: 'bot', text: '' }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          setMsgs((x) => { const y = [...x]; y[y.length - 1] = { role: 'bot', text: acc }; return y; });
        }
      } catch { /* mid-stream drop — keep the partial */ }
      if (!acc.trim()) setMsgs((x) => { const y = [...x]; y[y.length - 1] = { role: 'bot', text: t.chatOff }; return y; });
    } catch {
      setTyping(false);
      setMsgs((x) => [...x, { role: 'bot', text: t.chatOff }]);
    }
  };

  const submit = async () => {
    setFormErr('');
    if (!form.requirements.trim() && !form.contact.trim()) { setFormErr(t.needSomething); return; }
    setSending(true);
    try {
      const r = await createDemoInquiry(leadId, form);
      if (r.ok) setSent(true);
      else setFormErr(r.message ?? t.needSomething);
    } catch {
      setFormErr(t.needSomething);
    } finally {
      setSending(false);
    }
  };

  const field = (v: string, set: (s: string) => void, ph: string, textarea = false) =>
    textarea ? (
      <textarea value={v} onChange={(e) => set(e.target.value)} placeholder={ph} rows={3}
        style={{ width: '100%', padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
    ) : (
      <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph}
        style={{ width: '100%', height: 42, padding: '0 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
    );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="row" style={{ gap: 12, marginBottom: 8 }}>
          <Mark size={38} tile />
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Agents Verse</div>
        </div>
        <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', margin: '10px 0 6px' }}>{t.heading(company)}</h1>
        <p style={{ fontSize: 15.5, color: 'var(--ink-2)', margin: '0 0 22px' }}>{t.sub}</p>

        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', fontSize: 14, fontWeight: 600 }}>{t.chatTitle}</div>
          <div ref={scrollRef} style={{ maxHeight: 340, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {msgs.map((m, i) => (
              <div key={i} className="row" style={{ gap: 9, alignItems: 'flex-end', flexDirection: m.role === 'you' ? 'row-reverse' : 'row', alignSelf: m.role === 'you' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                {m.role === 'bot' && <Mark size={24} tile />}
                <div style={{ padding: '10px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-line',
                  background: m.role === 'you' ? 'var(--primary)' : 'var(--surface-muted)', color: m.role === 'you' ? '#fff' : 'var(--ink)',
                  borderBottomRightRadius: m.role === 'you' ? 4 : 14, borderBottomLeftRadius: m.role === 'you' ? 14 : 4 }}>{m.text}</div>
              </div>
            ))}
            {typing && (
              <div className="row" style={{ gap: 9, alignItems: 'flex-end' }}>
                <Mark size={24} tile />
                <div style={{ padding: '12px 14px', borderRadius: 14, borderBottomLeftRadius: 4, background: 'var(--surface-muted)', display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--ink-3)', animation: `typing 1.2s ${i * 0.16}s infinite` }} />)}
                </div>
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 8, padding: '10px 14px 14px', borderTop: '1px solid var(--border)' }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(val)} placeholder={t.placeholder}
              style={{ flex: 1, height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
            <button className="btn btn-primary btn-icon" style={{ width: 42, height: 42 }} onClick={() => send(val)} aria-label="Send"><Icon name="send" size={17} /></button>
          </div>
        </div>

        <div className="card" style={{ padding: '20px 22px' }}>
          <h2 style={{ fontSize: 17, margin: '0 0 14px' }}>{t.formTitle}</h2>
          {sent ? (
            <div className="row" style={{ gap: 10, color: 'var(--success)', fontSize: 15 }}>
              <Icon name="check" size={20} /> <span style={{ color: 'var(--ink)' }}>{t.thanks}</span>
            </div>
          ) : (
            <div className="col" style={{ gap: 11 }}>
              <div className="row" style={{ gap: 11 }}>
                <div style={{ flex: 1 }}>{field(form.name, (s) => setForm((f) => ({ ...f, name: s })), t.name)}</div>
                <div style={{ flex: 1 }}>{field(form.contact, (s) => setForm((f) => ({ ...f, contact: s })), t.contact)}</div>
              </div>
              {field(form.requirements, (s) => setForm((f) => ({ ...f, requirements: s })), t.requirements, true)}
              <div className="row" style={{ gap: 11 }}>
                <div style={{ flex: 1 }}>{field(form.budget, (s) => setForm((f) => ({ ...f, budget: s })), t.budget)}</div>
                <div style={{ flex: 1 }}>{field(form.timeline, (s) => setForm((f) => ({ ...f, timeline: s })), t.timeline)}</div>
              </div>
              {formErr && <div style={{ color: 'var(--danger)', fontSize: 13.5 }}>{formErr}</div>}
              <button className="btn btn-primary" disabled={sending} onClick={submit} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                {sending ? t.sending : t.submit}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
