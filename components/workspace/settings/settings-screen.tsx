/* =========================================================================
   AGENTS VERSE — SettingsScreen
   Port of settings.jsx → TypeScript / Next.js 'use client'.
   Sub-components (Toggle, Slider, SettingRow, Panel, SEG) are local to this
   file only — they are not exported because nothing outside this module uses
   them directly.
   ========================================================================= */
'use client';

import { useState } from 'react';
import { Icon } from '@/components/brand/icon';
import { Mark } from '@/components/brand/mark';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { useI18n } from '@/lib/i18n';
import { AV } from '@/lib/data';
import { AUTONOMY } from '@/components/workspace/autonomy-control';
import type { ToastKind } from '@/lib/providers/toast-provider';

/* -------------------------------------------------------------------------
   Prop types
   ------------------------------------------------------------------------- */

export interface SettingsScreenProps {
  mode: string;
  setMode: (mode: string) => void;
  onAction: (msg: string, kind?: ToastKind) => void;
}

/* -------------------------------------------------------------------------
   Local sub-components — presentational helpers only
   ------------------------------------------------------------------------- */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="focusable"
      aria-pressed={on}
      style={{
        width: 42, height: 24, borderRadius: 99, flex: 'none',
        background: on ? 'var(--primary)' : 'var(--surface-sunk)',
        border: on ? 'none' : '1px solid var(--border-strong)',
        position: 'relative', transition: 'background .2s',
      }}
    >
      <span style={{
        position: 'absolute', top: on ? 2 : 1, left: on ? 20 : 1,
        width: 20, height: 20, borderRadius: 99, background: '#fff',
        boxShadow: 'var(--sh-xs)', transition: 'left .2s',
      }} />
    </button>
  );
}

function Slider({
  value, min, max, step = 1, onChange, unit = '', prefix = '',
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; unit?: string; prefix?: string;
}) {
  return (
    <div className="row" style={{ gap: 14, minWidth: 200 }}>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: 'var(--primary)', height: 4 }}
      />
      <span className="mono" style={{ fontSize: 13, fontWeight: 600, minWidth: 62, textAlign: 'right' }}>
        {prefix}{value.toLocaleString('en-US')}{unit}
      </span>
    </div>
  );
}

function SettingRow({
  title, desc, children, last,
}: {
  title: string; desc?: string; children?: React.ReactNode; last?: boolean;
}) {
  return (
    <div
      className="row between"
      style={{
        gap: 24, padding: '15px 0',
        borderBottom: last ? 'none' : '1px solid var(--border-soft)',
        alignItems: 'center', flexWrap: 'wrap',
      }}
    >
      <div style={{ maxWidth: 420, minWidth: 200, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        {desc && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, lineHeight: 1.4 }}>{desc}</div>
        )}
      </div>
      <div className="row" style={{ gap: 10, flex: 'none' }}>{children}</div>
    </div>
  );
}

function Panel({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '20px 22px', marginBottom: 18 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontSize: 17 }}>{title}</h2>
        {desc && <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Seg({
  opts, val, set,
}: {
  opts: string[]; val: string; set: (v: string) => void;
}) {
  return (
    <div className="row" style={{ gap: 4, background: 'var(--surface-muted)', padding: 3, borderRadius: 9 }}>
      {opts.map(o => (
        <button
          key={o}
          onClick={() => set(o)}
          style={{
            padding: '6px 12px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
            background: val === o ? 'var(--surface-elev)' : 'transparent',
            color: val === o ? 'var(--ink)' : 'var(--ink-3)',
            boxShadow: val === o ? 'var(--sh-xs)' : 'none',
            transition: '.15s',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------
   AgentConfig state shape
   ------------------------------------------------------------------------- */

interface AgentCfg {
  enabled: boolean;
  review: boolean;
}

/* -------------------------------------------------------------------------
   SettingsScreen
   ------------------------------------------------------------------------- */

export function SettingsScreen({ mode, setMode, onAction }: SettingsScreenProps) {
  const { t } = useI18n();

  const SECTIONS = [
    { id: 'brand',      label: 'Brand',           icon: 'spark'   },
    { id: 'autonomy',   label: 'Autonomy',         icon: 'shield'  },
    { id: 'pricing',    label: 'Pricing rules',    icon: 'dollar'  },
    { id: 'outreach',   label: 'Outreach rules',   icon: 'send'    },
    { id: 'escalation', label: 'Escalation rules', icon: 'alert'   },
    { id: 'cost',       label: 'AI cost limits',   icon: 'bolt'    },
    { id: 'agents',     label: 'Agent limits',     icon: 'agents'  },
  ];

  const [sec, setSec] = useState('autonomy');

  // Brand
  const [company, setCompany] = useState('Agents Verse');
  const [primary, setPrimary] = useState('#e8631c');
  const [tone, setTone] = useState('Premium');
  const [typeStyle, setTypeStyle] = useState('Humanist');

  // Outreach rules
  const [maxOut, setMaxOut] = useState(40);
  const [followUp, setFollowUp] = useState(3);
  const [stopNo, setStopNo] = useState(true);
  const [noPromise, setNoPromise] = useState(true);
  const [unsub, setUnsub] = useState(true);

  // Pricing / quote rules
  const [autoQuote, setAutoQuote] = useState(true);
  const [approveAbove, setApproveAbove] = useState(4000);
  const [customEsc, setCustomEsc] = useState(true);

  // AI cost limits
  const [daily, setDaily] = useState(50);
  const [monthly, setMonthly] = useState(1200);
  const [perDemo, setPerDemo] = useState(6);
  const [perOut, setPerOut] = useState(1);
  const [confThresh, setConfThresh] = useState(80);
  const [discount, setDiscount] = useState(20);

  // Escalation triggers
  const [esc, setEsc] = useState({
    call: true, legal: true, custom: true, complaint: true, lowconf: true, discount: true,
  });

  // Pricing values
  const [prices, setPrices] = useState({ landing: 900, business: 2400, monthly: 240 });

  // Per-agent config — initialised from AV.agents seed
  const [agentCfg, setAgentCfg] = useState<Record<string, AgentCfg>>(() =>
    Object.fromEntries(
      AV.agents.map(a => [a.id, { enabled: true, review: a.status === 'review' || a.conf < 80 }]),
    ),
  );

  const colorOpts = ['#e8631c', '#0e7490', '#1f8a5b', '#6d49c7'];

  return (
    <div style={{ padding: '26px 28px 60px', maxWidth: 1280, margin: '0 auto' }}>
      {/* Header */}
      <div className="row between wrap" style={{ gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 28, letterSpacing: '-0.03em', marginBottom: 6 }}>{t('set.title')}</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)' }}>{t('set.sub')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => onAction('Settings saved', 'success')}>
          {t('set.save')}
        </button>
      </div>

      {/* Two-column grid: nav + content */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 24, alignItems: 'start' }}
        className="settings-grid"
      >
        {/* Section nav */}
        <div style={{ position: 'sticky', top: 'calc(var(--shell-top) + 22px)' }} className="settings-nav">
          <div className="col" style={{ gap: 2 }}>
            {SECTIONS.map(s => {
              const active = sec === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSec(s.id)}
                  className="row focusable"
                  style={{
                    gap: 11, padding: '9px 11px', borderRadius: 9, width: '100%', textAlign: 'left',
                    background: active ? 'var(--primary-soft)' : 'transparent', transition: '.15s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-muted)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <Icon name={s.icon} size={16} style={{ color: active ? 'var(--primary)' : 'var(--ink-3)' }} />
                  <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? 'var(--primary)' : 'var(--ink)' }}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: 16, padding: '13px 14px', borderRadius: 12, background: 'var(--surface-muted)' }}>
            <div className="row" style={{ gap: 8, marginBottom: 7 }}>
              <Icon name="shield" size={14} style={{ color: 'var(--primary)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Guardrails active</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
              All external actions pass through these rules before they run.
            </p>
          </div>
        </div>

        {/* Content area */}
        <div>
          {/* ── Brand ── */}
          {sec === 'brand' && (
            <Panel title="Brand" desc="How the company shows up in demos and outreach.">
              <SettingRow title="Company name">
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  style={{
                    height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', width: 220,
                  }}
                />
              </SettingRow>
              <SettingRow title="Logo" desc="Used on demos, emails and the dashboard.">
                <span className="row" style={{ gap: 10 }}>
                  <Mark size={34} tile />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => onAction('Logo upload opened')}
                  >
                    Replace
                  </button>
                </span>
              </SettingRow>
              <SettingRow title="Primary color">
                <div className="row" style={{ gap: 8 }}>
                  {colorOpts.map(c => (
                    <button
                      key={c}
                      onClick={() => setPrimary(c)}
                      style={{
                        width: 28, height: 28, borderRadius: 8, background: c,
                        border: primary === c ? '2px solid var(--ink)' : '2px solid transparent',
                        boxShadow: 'inset 0 0 0 2px var(--surface)',
                      }}
                    />
                  ))}
                </div>
              </SettingRow>
              <SettingRow title="Typography">
                <Seg opts={['Humanist', 'Grotesque', 'Geometric']} val={typeStyle} set={setTypeStyle} />
              </SettingRow>
              <SettingRow title="Tone of voice" desc="Default voice for AI-written copy." last>
                <Seg opts={['Friendly', 'Premium', 'Direct']} val={tone} set={setTone} />
              </SettingRow>
            </Panel>
          )}

          {/* ── Autonomy ── */}
          {sec === 'autonomy' && (
            <Panel title="Autonomy mode" desc="How much the AI can do before it needs you.">
              <div className="col" style={{ gap: 10, marginTop: 6 }}>
                {AUTONOMY.map((a, i) => {
                  const active = mode === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setMode(a.id)}
                      className="row between focusable"
                      style={{
                        textAlign: 'left', padding: '15px 16px', borderRadius: 13,
                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                        background: active ? 'var(--primary-soft)' : 'var(--surface)',
                        boxShadow: active ? '0 0 0 3px var(--primary-soft)' : 'none',
                        transition: '.15s',
                      }}
                    >
                      <span className="row" style={{ gap: 13 }}>
                        <span style={{
                          width: 34, height: 34, borderRadius: 99, display: 'grid', placeItems: 'center',
                          flex: 'none', background: active ? 'var(--primary)' : 'var(--surface-muted)',
                          color: active ? '#fff' : 'var(--ink-3)', fontWeight: 600, fontSize: 14,
                        }}>
                          {i + 1}
                        </span>
                        <span>
                          <div style={{ fontSize: 14.5, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--ink)' }}>
                            {a.label}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{a.desc}</div>
                        </span>
                      </span>
                      {active && <Icon name="check" size={20} style={{ color: 'var(--primary)' }} />}
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          {/* ── Pricing rules ── */}
          {sec === 'pricing' && (
            <>
              <Panel title="Package pricing" desc="Prices the AI can quote. Custom builds are always quoted by a human.">
                <SettingRow title="Landing Page" desc="Single high-conversion page.">
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>$</span>
                    <input
                      type="number" value={prices.landing}
                      onChange={e => setPrices(p => ({ ...p, landing: +e.target.value }))}
                      style={{ height: 36, width: 100, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)' }}
                    />
                  </span>
                </SettingRow>
                <SettingRow title="Business Website" desc="Up to 6 pages, full system.">
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>$</span>
                    <input
                      type="number" value={prices.business}
                      onChange={e => setPrices(p => ({ ...p, business: +e.target.value }))}
                      style={{ height: 36, width: 100, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)' }}
                    />
                  </span>
                </SettingRow>
                <SettingRow title="Monthly Growth Care" desc="Per month, recurring." last>
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>$</span>
                    <input
                      type="number" value={prices.monthly}
                      onChange={e => setPrices(p => ({ ...p, monthly: +e.target.value }))}
                      style={{ height: 36, width: 100, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)' }}
                    />
                    <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>/mo</span>
                  </span>
                </SettingRow>
              </Panel>
              <Panel title="Quote rules">
                <SettingRow title="Auto-quote below threshold" desc="AI can send a quote without you under the limit.">
                  <Toggle on={autoQuote} onChange={setAutoQuote} />
                </SettingRow>
                <SettingRow title="Founder approval above" desc="Quotes over this value always need you.">
                  <Slider value={approveAbove} min={1000} max={10000} step={500} onChange={setApproveAbove} prefix="$" />
                </SettingRow>
                <SettingRow title="Custom builds always escalate" desc="Any custom app / integration request routes to a human." last>
                  <Toggle on={customEsc} onChange={setCustomEsc} />
                </SettingRow>
              </Panel>
            </>
          )}

          {/* ── Outreach rules ── */}
          {sec === 'outreach' && (
            <Panel title="Outreach rules" desc="Keeps outreach controlled and respectful — never a spam machine.">
              <SettingRow title="Max outreach per day" desc="A hard daily cap across all channels.">
                <Slider value={maxOut} min={5} max={100} step={5} onChange={setMaxOut} />
              </SettingRow>
              <SettingRow title="Follow-up delay" desc="Days to wait before a single follow-up.">
                <Slider value={followUp} min={1} max={10} onChange={setFollowUp} unit=" days" />
              </SettingRow>
              <SettingRow title="Stop if client says no" desc="All follow-up stops the moment a client declines.">
                <Toggle on={stopNo} onChange={setStopNo} />
              </SettingRow>
              <SettingRow title="Never overpromise results" desc="Agents won’t guarantee revenue, rankings or outcomes.">
                <Toggle on={noPromise} onChange={setNoPromise} />
              </SettingRow>
              <SettingRow title="Include unsubscribe / stop option" desc="Every message gives an easy way out." last>
                <Toggle on={unsub} onChange={setUnsub} />
              </SettingRow>
            </Panel>
          )}

          {/* ── Escalation rules ── */}
          {sec === 'escalation' && (
            <Panel title="Escalation rules" desc="When the AI must stop and bring in a human.">
              <SettingRow title="Client asks for a call">
                <Toggle on={esc.call} onChange={v => setEsc(s => ({ ...s, call: v }))} />
              </SettingRow>
              <SettingRow title="Legal, payment or domain question">
                <Toggle on={esc.legal} onChange={v => setEsc(s => ({ ...s, legal: v }))} />
              </SettingRow>
              <SettingRow title="Custom system / app request">
                <Toggle on={esc.custom} onChange={v => setEsc(s => ({ ...s, custom: v }))} />
              </SettingRow>
              <SettingRow title="Client complaint or negative reply">
                <Toggle on={esc.complaint} onChange={v => setEsc(s => ({ ...s, complaint: v }))} />
              </SettingRow>
              <SettingRow title="AI confidence below" desc="Low-confidence work is held for review.">
                <Slider value={confThresh} min={50} max={95} step={5} onChange={setConfThresh} unit="%" />
              </SettingRow>
              <SettingRow title="Discount request above" desc="Large discount asks need your sign-off." last>
                <Slider value={discount} min={5} max={50} step={5} onChange={setDiscount} unit="%" />
              </SettingRow>
            </Panel>
          )}

          {/* ── AI cost limits ── */}
          {sec === 'cost' && (
            <Panel title="AI cost limits" desc="Budgets and alerts so spend never runs away.">
              {/* Spend gauge — verbatim from source */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--warning-soft)', marginBottom: 8 }}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <Icon name="bolt" size={15} style={{ color: 'var(--warning)' }} /> Today’s spend
                  </span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>$42.80 / ${daily}.00</span>
                </div>
                <div className="track" style={{ height: 7 }}>
                  <i style={{ width: Math.min(100, 42.8 / daily * 100) + '%', background: 'var(--warning)' }} />
                </div>
              </div>
              <SettingRow title="Daily budget">
                <Slider value={daily} min={20} max={200} step={10} onChange={setDaily} prefix="$" />
              </SettingRow>
              <SettingRow title="Monthly budget">
                <Slider value={monthly} min={300} max={5000} step={100} onChange={setMonthly} prefix="$" />
              </SettingRow>
              <SettingRow title="Cost per demo limit">
                <Slider value={perDemo} min={1} max={20} onChange={setPerDemo} prefix="$" />
              </SettingRow>
              <SettingRow title="Cost per outreach limit">
                <Slider value={perOut} min={1} max={10} step={0.5} onChange={setPerOut} prefix="$" />
              </SettingRow>
              <SettingRow title="Alert threshold" desc="Warn you when spend reaches this share of budget." last>
                {/* Static 85% threshold display — source keeps onChange as no-op */}
                <Slider value={85} min={50} max={95} step={5} onChange={() => {}} unit="%" />
              </SettingRow>
            </Panel>
          )}

          {/* ── Agent limits ── */}
          {sec === 'agents' && (
            <Panel title="Agent limits" desc="Enable, throttle and gate each agent individually.">
              <div className="scroll-x" style={{ margin: '4px -4px 0' }}>
                <div style={{ minWidth: 560 }}>
                  <div className="row" style={{ padding: '0 4px 10px', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                    <span style={{ flex: 2 }}>Agent</span>
                    <span style={{ flex: 1 }}>Max / day</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>Review</span>
                    <span style={{ width: 70, textAlign: 'right' }}>Active</span>
                  </div>
                  <div className="col" style={{ gap: 0 }}>
                    {AV.agents.map(a => (
                      <div key={a.id} className="row" style={{ padding: '11px 4px', borderTop: '1px solid var(--border-soft)', alignItems: 'center' }}>
                        <span className="row" style={{ gap: 10, flex: 2, minWidth: 0 }}>
                          <AgentAvatar id={a.id} size={28} />
                          <span style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.role.replace(' Agent', '')}
                            </div>
                          </span>
                        </span>
                        <span className="mono" style={{ flex: 1, fontSize: 13, color: 'var(--ink-2)' }}>
                          {a.role.includes('Lead') ? 200 : a.role.includes('Outreach') ? 60 : 30}
                        </span>
                        <span style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                          <Toggle
                            on={agentCfg[a.id]?.review ?? false}
                            onChange={v => setAgentCfg(c => ({ ...c, [a.id]: { ...c[a.id], review: v } }))}
                          />
                        </span>
                        <span style={{ width: 70, display: 'flex', justifyContent: 'flex-end' }}>
                          <Toggle
                            on={agentCfg[a.id]?.enabled ?? true}
                            onChange={v => setAgentCfg(c => ({ ...c, [a.id]: { ...c[a.id], enabled: v } }))}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
