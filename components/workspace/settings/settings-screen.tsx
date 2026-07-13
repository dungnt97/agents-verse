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
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useWorkspaceData } from '@/lib/providers/workspace-data-provider';
import { AUTONOMY } from '@/components/workspace/autonomy-control';
import { updateGuardrails, updatePricing, updateMarketPlan } from '@/lib/actions/settings';
import { useWorkspaceState } from '@/lib/providers/workspace-state-provider';
import { useToast } from '@/lib/providers/toast-provider';
import type { WorkspaceSettings } from '@/lib/repositories/ops';
import { MARKET_CATALOG, MARKET_NICHES } from '@/lib/discovery/market-catalog';
import { DEFAULT_MARKET_PLAN, type MarketPlan } from '@/lib/discovery/market-planner';

/* -------------------------------------------------------------------------
   Prop types
   ------------------------------------------------------------------------- */

export interface SettingsScreenProps {
  /** Founder settings singleton from the DB (null in demo / no-DB mode). */
  settings: WorkspaceSettings | null;
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

/* -------------------------------------------------------------------------
   SettingsScreen
   ------------------------------------------------------------------------- */

export function SettingsScreen({ settings }: SettingsScreenProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { mode, setMode, useDb } = useWorkspaceState();
  const onAction = useToast();
  const [isSaving, startSave] = useTransition();

  // Persisted founder controls hydrate from the DB settings singleton. Keys mirror
  // the jsonb shape written by updateGuardrails / updatePricing; missing keys (and
  // the whole row, in no-DB/demo mode) fall back to the original showcase defaults.
  const gr = (settings?.guardrails ?? {}) as Record<string, unknown>;
  const pr = (settings?.pricing ?? {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  const { agents } = useWorkspaceData();
  // Live daily AI spend = sum of the agents' estimated cost today (no fabricated figure).
  const spend = Math.round(agents.reduce((sum, a) => sum + (a.cost ?? 0), 0) * 100) / 100;

  const SECTIONS = [
    { id: 'autonomy',   label: t('set.sectionAutonomy'),   icon: 'shield'  },
    { id: 'pricing',    label: t('set.sectionPricing'),    icon: 'dollar'  },
    { id: 'cost',       label: t('set.sectionCost'),       icon: 'bolt'    },
    { id: 'market',     label: t('set.sectionMarket'),     icon: 'globe'   },
  ];

  const [sec, setSec] = useState('autonomy');



  // Pricing / quote rules
  // Founder-approval-above threshold — persisted (guardrails.autoApproveLimit).
  const [approveAbove, setApproveAbove] = useState(() => num(gr.autoApproveLimit, 4000));

  // AI cost limits — daily cap + per-run cost are persisted (guardrails.*).
  const [daily, setDaily] = useState(() => num(gr.dailyCostLimit, 50));
  const [costPerRun, setCostPerRun] = useState(() => num(gr.costPerRun, 0.4));


  // Pricing values — package prices are persisted (pricing.* in the settings row).
  const [prices, setPrices] = useState(() => ({
    landing: num(pr.landingPage, 900),
    business: num(pr.businessWebsite, 2400),
    monthly: num(pr.monthlyGrowthCare, 240),
  }));

  // Market Hunter pool (countries + niches + master switch) — persisted (settings.marketPlan).
  const [marketPlan, setMarketPlan] = useState<MarketPlan>(() => settings?.marketPlan ?? DEFAULT_MARKET_PLAN);
  const toggleCountry = (code: string) =>
    setMarketPlan(p => ({
      ...p,
      countries: p.countries.includes(code) ? p.countries.filter(c => c !== code) : [...p.countries, code],
    }));
  const toggleNiche = (niche: string) =>
    setMarketPlan(p => ({
      ...p,
      niches: p.niches.includes(niche) ? p.niches.filter(n => n !== niche) : [...p.niches, niche],
    }));



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
              /* Persist guardrails (auto-approve limit, daily cost limit, cost-per-run) */
              const grResult = await updateGuardrails({
                autoApproveLimit: approveAbove,
                dailyCostLimit: daily,
                costPerRun,
              });
              /* Persist pricing (package prices) */
              const prResult = await updatePricing({
                landingPage: prices.landing,
                businessWebsite: prices.business,
                monthlyGrowthCare: prices.monthly,
              });
              /* Persist the Market Hunter pool (countries, niches, master switch) */
              const mpResult = await updateMarketPlan(marketPlan);
              if (grResult.ok && prResult.ok && mpResult.ok) {
                router.refresh();
                onAction('Settings saved', 'success');
              } else {
                const msg = grResult.message ?? prResult.message ?? mpResult.message ?? 'Save failed';
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
                <SettingRow title={t('set.founderApproval')} desc={t('set.founderApprovalDesc')}>
                  <Slider value={approveAbove} min={1000} max={10000} step={500} onChange={setApproveAbove} prefix="$" />
                </SettingRow>
              </Panel>
            </>
          )}

          {/* ── Outreach rules ── */}

          {/* ── Escalation rules ── */}

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
              <SettingRow title={t('set.costPerRun')} desc={t('set.costPerRunDesc')}>
                <Slider value={costPerRun} min={0.1} max={2} step={0.1} onChange={setCostPerRun} prefix="$" />
              </SettingRow>
            </Panel>
          )}

          {/* ── Agent limits ── */}

          {/* ── Market Hunter ── */}
          {sec === 'market' && (
            <Panel title={t('set.marketTitle')} desc={t('set.marketDesc')}>
              <SettingRow title={t('set.marketEnable')} desc={t('set.marketEnableDesc')}>
                <Toggle on={marketPlan.enabled} onChange={v => setMarketPlan(p => ({ ...p, enabled: v }))} />
              </SettingRow>
              <SettingRow title={t('set.marketCountries')} desc={t('set.marketCountriesDesc')}>
                <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-end', maxWidth: 480 }}>
                  {MARKET_CATALOG.map(c => (
                    <button
                      key={c.code}
                      onClick={() => toggleCountry(c.code)}
                      className={'chip' + (marketPlan.countries.includes(c.code) ? ' active' : '')}
                      style={{ height: 32 }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow title={t('set.marketNiches')} desc={t('set.marketNichesDesc')} last>
                <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-end', maxWidth: 480 }}>
                  {MARKET_NICHES.map(n => (
                    <button
                      key={n}
                      onClick={() => toggleNiche(n)}
                      className={'chip' + (marketPlan.niches.includes(n) ? ' active' : '')}
                      style={{ height: 32 }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </SettingRow>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 14, lineHeight: 1.4 }}>
                {t('set.marketAutonomyNote')}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
