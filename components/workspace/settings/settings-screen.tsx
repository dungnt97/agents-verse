/* =========================================================================
   AGENTS VERSE — SettingsScreen
   Settings screen ('use client').
   Sub-components (Toggle, Slider, SettingRow, Panel, SEG) are local to this
   file only — they are not exported because nothing outside this module uses
   them directly.
   ========================================================================= */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/brand/icon';
import { Mark } from '@/components/brand/mark';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { AUTONOMY } from '@/components/workspace/autonomy-control';
import { updateGuardrails, updatePricing } from '@/lib/actions/settings';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
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
  const router = useRouter();
  const { useDb } = useWorkspaceState();
  const [isSaving, startSave] = useTransition();
  const { agents } = useWorkspaceData();
  // Live daily AI spend = sum of the agents' estimated cost today (no fabricated figure).
  const spend = Math.round(agents.reduce((sum, a) => sum + (a.cost ?? 0), 0) * 100) / 100;

  const SECTIONS = [
    { id: 'brand',      label: t('set.sectionBrand'),      icon: 'spark'   },
    { id: 'autonomy',   label: t('set.sectionAutonomy'),   icon: 'shield'  },
    { id: 'pricing',    label: t('set.sectionPricing'),    icon: 'dollar'  },
    { id: 'outreach',   label: t('set.sectionOutreach'),   icon: 'send'    },
    { id: 'escalation', label: t('set.sectionEscalation'), icon: 'alert'   },
    { id: 'cost',       label: t('set.sectionCost'),       icon: 'bolt'    },
    { id: 'agents',     label: t('set.sectionAgents'),     icon: 'agents'  },
  ];

  const [sec, setSec] = useState('autonomy');

  // Brand
  const [company, setCompany] = useState('Agents Verse');
  const [primary, setPrimary] = useState('#e8631c');
  const [tone, setTone] = useState(t('set.tonePremium'));
  const [typeStyle, setTypeStyle] = useState(t('set.typHumanist'));

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
  const [costPerRun, setCostPerRun] = useState(0.4);
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

  // Per-agent config — initialised from workspace agents directory
  const [agentCfg, setAgentCfg] = useState<Record<string, AgentCfg>>(() =>
    Object.fromEntries(
      agents.map(a => [a.id, { enabled: true, review: a.status === 'review' || a.conf < 80 }]),
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
        <button
          className="btn btn-primary"
          disabled={isSaving}
          onClick={() => {
            // Demo mode (no DB) → cosmetic success, skip the server actions.
            if (!useDb) { onAction('Settings saved', 'success'); return; }
            startSave(async () => {
              /* Persist guardrails (auto-approve limit, daily/confidence/discount thresholds) */
              const grResult = await updateGuardrails({
                autoApproveLimit: approveAbove,
                dailyCostLimit: daily,
                costPerRun,
                confidenceThreshold: confThresh,
                maxDiscountPct: discount,
              });
              /* Persist pricing (package prices) */
              const prResult = await updatePricing({
                landingPage: prices.landing,
                businessWebsite: prices.business,
                monthlyGrowthCare: prices.monthly,
              });
              if (grResult.ok && prResult.ok) {
                router.refresh();
                onAction('Settings saved', 'success');
              } else {
                const msg = grResult.message ?? prResult.message ?? 'Save failed';
                onAction(msg, 'danger');
              }
            });
          }}
        >
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
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{t('set.guardrailsActive')}</span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
              {t('set.guardrailsDesc')}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div>
          {/* ── Brand ── */}
          {sec === 'brand' && (
            <Panel title={t('set.brandTitle')} desc={t('set.brandDesc')}>
              <SettingRow title={t('set.companyName')}>
                <input
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  style={{
                    height: 38, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)',
                    background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)', width: 220,
                  }}
                />
              </SettingRow>
              <SettingRow title={t('set.logo')} desc={t('set.logoDesc')}>
                <span className="row" style={{ gap: 10 }}>
                  <Mark size={34} tile />
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => onAction('Logo upload opened')}
                  >
                    {t('set.logoReplace')}
                  </button>
                </span>
              </SettingRow>
              <SettingRow title={t('set.primaryColor')}>
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
              <SettingRow title={t('set.typography')}>
                <Seg
                  opts={[t('set.typHumanist'), t('set.typGrotesque'), t('set.typGeometric')]}
                  val={typeStyle}
                  set={setTypeStyle}
                />
              </SettingRow>
              <SettingRow title={t('set.toneOfVoice')} desc={t('set.toneDesc')} last>
                <Seg
                  opts={[t('set.toneFriendly'), t('set.tonePremium'), t('set.toneDirect')]}
                  val={tone}
                  set={setTone}
                />
              </SettingRow>
            </Panel>
          )}

          {/* ── Autonomy ── */}
          {sec === 'autonomy' && (
            <Panel title={t('set.autonomyTitle')} desc={t('set.autonomyDesc')}>
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
                            {t(`shell.autonomy${a.id.charAt(0).toUpperCase() + a.id.slice(1)}Label`)}
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{t(`shell.autonomy${a.id.charAt(0).toUpperCase() + a.id.slice(1)}Desc`)}</div>
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
              <Panel title={t('set.packagePricingTitle')} desc={t('set.packagePricingDesc')}>
                <SettingRow title={t('set.landingPage')} desc={t('set.landingPageDesc')}>
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>$</span>
                    <input
                      type="number" value={prices.landing}
                      onChange={e => setPrices(p => ({ ...p, landing: +e.target.value }))}
                      style={{ height: 36, width: 100, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)' }}
                    />
                  </span>
                </SettingRow>
                <SettingRow title={t('set.businessWebsite')} desc={t('set.businessWebsiteDesc')}>
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>$</span>
                    <input
                      type="number" value={prices.business}
                      onChange={e => setPrices(p => ({ ...p, business: +e.target.value }))}
                      style={{ height: 36, width: 100, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)' }}
                    />
                  </span>
                </SettingRow>
                <SettingRow title={t('set.monthlyGrowthCare')} desc={t('set.monthlyGrowthDesc')} last>
                  <span className="row" style={{ gap: 6 }}>
                    <span style={{ color: 'var(--ink-3)' }}>$</span>
                    <input
                      type="number" value={prices.monthly}
                      onChange={e => setPrices(p => ({ ...p, monthly: +e.target.value }))}
                      style={{ height: 36, width: 100, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13.5, color: 'var(--ink)' }}
                    />
                    <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{t('set.perMonth')}</span>
                  </span>
                </SettingRow>
              </Panel>
              <Panel title={t('set.quoteRulesTitle')}>
                <SettingRow title={t('set.autoQuote')} desc={t('set.autoQuoteDesc')}>
                  <Toggle on={autoQuote} onChange={setAutoQuote} />
                </SettingRow>
                <SettingRow title={t('set.founderApproval')} desc={t('set.founderApprovalDesc')}>
                  <Slider value={approveAbove} min={1000} max={10000} step={500} onChange={setApproveAbove} prefix="$" />
                </SettingRow>
                <SettingRow title={t('set.customEscalate')} desc={t('set.customEscalateDesc')} last>
                  <Toggle on={customEsc} onChange={setCustomEsc} />
                </SettingRow>
              </Panel>
            </>
          )}

          {/* ── Outreach rules ── */}
          {sec === 'outreach' && (
            <Panel title={t('set.outreachTitle')} desc={t('set.outreachDesc')}>
              <SettingRow title={t('set.maxOutreachPerDay')} desc={t('set.maxOutreachDesc')}>
                <Slider value={maxOut} min={5} max={100} step={5} onChange={setMaxOut} />
              </SettingRow>
              <SettingRow title={t('set.followUpDelay')} desc={t('set.followUpDesc')}>
                <Slider value={followUp} min={1} max={10} onChange={setFollowUp} unit={t('set.followUpUnit')} />
              </SettingRow>
              <SettingRow title={t('set.stopIfNo')} desc={t('set.stopIfNoDesc')}>
                <Toggle on={stopNo} onChange={setStopNo} />
              </SettingRow>
              <SettingRow title={t('set.neverOverpromise')} desc={t('set.neverOverpromiseDesc')}>
                <Toggle on={noPromise} onChange={setNoPromise} />
              </SettingRow>
              <SettingRow title={t('set.includeUnsub')} desc={t('set.includeUnsubDesc')} last>
                <Toggle on={unsub} onChange={setUnsub} />
              </SettingRow>
            </Panel>
          )}

          {/* ── Escalation rules ── */}
          {sec === 'escalation' && (
            <Panel title={t('set.escalationTitle')} desc={t('set.escalationDesc')}>
              <SettingRow title={t('set.escClientCall')}>
                <Toggle on={esc.call} onChange={v => setEsc(s => ({ ...s, call: v }))} />
              </SettingRow>
              <SettingRow title={t('set.escLegalPayment')}>
                <Toggle on={esc.legal} onChange={v => setEsc(s => ({ ...s, legal: v }))} />
              </SettingRow>
              <SettingRow title={t('set.escCustomSystem')}>
                <Toggle on={esc.custom} onChange={v => setEsc(s => ({ ...s, custom: v }))} />
              </SettingRow>
              <SettingRow title={t('set.escComplaint')}>
                <Toggle on={esc.complaint} onChange={v => setEsc(s => ({ ...s, complaint: v }))} />
              </SettingRow>
              <SettingRow title={t('set.escConfThresh')} desc={t('set.escConfThreshDesc')}>
                <Slider value={confThresh} min={50} max={95} step={5} onChange={setConfThresh} unit="%" />
              </SettingRow>
              <SettingRow title={t('set.escDiscountAbove')} desc={t('set.escDiscountAboveDesc')} last>
                <Slider value={discount} min={5} max={50} step={5} onChange={setDiscount} unit="%" />
              </SettingRow>
            </Panel>
          )}

          {/* ── AI cost limits ── */}
          {sec === 'cost' && (
            <Panel title={t('set.costTitle')} desc={t('set.costDesc')}>
              {/* Spend gauge — verbatim from source */}
              <div style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--warning-soft)', marginBottom: 8 }}>
                <div className="row between" style={{ marginBottom: 8 }}>
                  <span className="row" style={{ gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <Icon name="bolt" size={15} style={{ color: 'var(--warning)' }} /> {t('set.todaySpend')}
                  </span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>${spend.toFixed(2)} / ${daily}.00</span>
                </div>
                <div className="track" style={{ height: 7 }}>
                  <i style={{ width: Math.min(100, (spend / daily) * 100) + '%', background: 'var(--warning)' }} />
                </div>
              </div>
              <SettingRow title={t('set.dailyBudget')}>
                <Slider value={daily} min={20} max={200} step={10} onChange={setDaily} prefix="$" />
              </SettingRow>
              <SettingRow title={t('set.monthlyBudget')}>
                <Slider value={monthly} min={300} max={5000} step={100} onChange={setMonthly} prefix="$" />
              </SettingRow>
              <SettingRow title={t('set.costPerDemo')}>
                <Slider value={perDemo} min={1} max={20} onChange={setPerDemo} prefix="$" />
              </SettingRow>
              <SettingRow title={t('set.costPerOutreach')}>
                <Slider value={perOut} min={1} max={10} step={0.5} onChange={setPerOut} prefix="$" />
              </SettingRow>
              <SettingRow title={t('set.costPerRun')} desc={t('set.costPerRunDesc')}>
                <Slider value={costPerRun} min={0.1} max={2} step={0.1} onChange={setCostPerRun} prefix="$" />
              </SettingRow>
              <SettingRow title={t('set.alertThreshold')} desc={t('set.alertThresholdDesc')} last>
                {/* Static 85% threshold display — source keeps onChange as no-op */}
                <Slider value={85} min={50} max={95} step={5} onChange={() => {}} unit="%" />
              </SettingRow>
            </Panel>
          )}

          {/* ── Agent limits ── */}
          {sec === 'agents' && (
            <Panel title={t('set.agentsTitle')} desc={t('set.agentsDesc')}>
              <div className="scroll-x" style={{ margin: '4px -4px 0' }}>
                <div style={{ minWidth: 560 }}>
                  <div className="row" style={{ padding: '0 4px 10px', fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                    <span style={{ flex: 2 }}>{t('set.colAgent')}</span>
                    <span style={{ flex: 1 }}>{t('set.colMaxDay')}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{t('set.colReview')}</span>
                    <span style={{ width: 70, textAlign: 'right' }}>{t('set.colActive')}</span>
                  </div>
                  <div className="col" style={{ gap: 0 }}>
                    {agents.map(a => (
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
