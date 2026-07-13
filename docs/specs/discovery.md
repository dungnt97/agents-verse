# Discovery — Spec

> Find real local businesses, qualify them, save them as leads, and auto-chain the worth-pursuing ones into a pipeline run.
> Owner-of-truth for: `lib/discovery/*`, the two search providers, the cost/field-mask split, the daily caps and safety floors, Orion's qualifier, the autonomous market hunter (`hunted_markets` + `settings.market_plan`), and the auto-chain eligibility gates.

## Boundary

**In scope.** `lib/discovery/*`, the web action `lib/actions/run-discovery.ts`, the Inngest cron `lib/inngest/functions/auto-discovery.ts`, the `hunted_markets` table (`lib/db/schema/markets.ts`), and the `market_plan` column on `settings` (`lib/db/schema/ops.ts`).

**Out of scope.** Everything after `startPipelineRun` — audit, demo-gen, outreach. Discovery's only handoff is that call. See `pipeline-orchestrator.md`.

**Runtime: BOTH.** `runDiscoveryCore` is the single worker-safe core, called from two places:

| Caller | Runtime | Adds |
|---|---|---|
| `lib/actions/run-discovery.ts` (`runDiscovery`) | web (`'use server'`) | `USE_DB` guard, `getCurrentUser()` auth gate, `revalidatePath` |
| `lib/inngest/functions/auto-discovery.ts` (`autoDiscovery`) | worker (tsx) | cron trigger, autonomy + market-pool gate |

Because the worker imports it, the entire runtime closure of `run-discovery-core.ts` is worker-chain code: relative imports only, no `server-only`, no `next/*`, no `lib/repositories/*`. That is invariant **B1**; `tests/discovery/run-discovery-core-worker-safety.test.ts` is what enforces it (see Tests).

## Contracts

**Public functions other code depends on**

| Symbol | File | Contract |
|---|---|---|
| `runDiscoveryCore(input)` | `run-discovery-core.ts` | `{ industry?, city?, auto? }` → `DiscoveryResult { found, enriched, upserted, started, message }`. Self-guards the provider credential; assumes the DB is live. Never throws for a missing key. |
| `searchBusinesses` / `enrichPlace` | `places-client.ts` | The provider seam. Both dispatch on `DISCOVERY_PROVIDER` via `useApify()`. A new provider must implement both. |
| `upsertDiscoveredLeads(rows)` | `upsert-discovered-leads.ts` | The shared leads-write helper. Lives outside `lib/repositories/` (that layer is `server-only`) but is re-exported from `lib/repositories/leads.ts` so it stays part of the documented leads surface. Must stay worker-safe. `runDiscoveryCore` and `startPipelineRun` also hit `db` directly for their own tables. |
| `planNextMarket` / `planHasWork` / `DEFAULT_MARKET_PLAN` | `market-planner.ts` | Pure, clock-free rotation. `planNextMarket` returns `null` when the plan is disabled or expands to nothing. |
| `hasContact` / `hasRealWebsite` | `contactability.ts`, `website-presence.ts` | The two auto-chain gates. Pure. |
| `orionQualify` | `orion-qualify.ts` | Batch qualification. **Never throws**; degrades to `fallbackQualify`. |
| `safeFetch` / `assertPublicUrl` | `safe-fetch.ts` | The only sanctioned way to fetch a lead-supplied URL from this subsystem. |
| `assessWebsite` / `scrapeEmail` | `bad-website-heuristic.ts`, `email-scraper.ts` | Live probes of the lead's site (both go through `safeFetch`). |
| `startPipelineRun(leadId, mode)` | `lib/inngest/start-pipeline-run.ts` | The handoff. Idempotent (`ON CONFLICT DO NOTHING` on the active-lead partial unique → `{ok:false}`). |

**Types.** `DiscoveredPlace`, `PlaceEnrichment` (`places-client.ts`); `SiteAssessment` (`bad-website-heuristic.ts`); `MarketPlan`, `MarketPick`, `HuntedMarket` (`market-planner.ts`); `QualifyInput`, `Qualified` (`orion-qualify.ts`); `MapsData` (`lib/data/types.ts`); `DiscoveredLeadInsert` (`map-place-to-lead.ts`).

**Tables.** `leads` (discovery columns: `place_id` UNIQUE, `website_uri`, `formatted_address`, `lat`/`lng`, `business_status`, `primary_type`, `email`, `phone`, `website_score`, `maps_data`); `hunted_markets` (rotation state, PK = `` `${country}|${region}|${niche}` ``); `settings.market_plan` (jsonb); `activity` (one row per pass, `agent: 'orion'`, `room: 'research'`); `pipeline_runs` (read for the daily-cap count and the re-pipeline guard; written only through `startPipelineRun`).

**Events.** Discovery emits none of its own. `startPipelineRun` sends `audit/requested { leadId, runId }`.

**Env vars read here** (defaults + unset behavior are owned by `../env-reference.md` — do not restate them there): `DISCOVERY_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `APIFY_API_TOKEN`, `APIFY_MAX_REVIEWS`, `APIFY_REVIEWS_SORT`, `APIFY_MAX_IMAGES`, `DISCOVERY_DAILY_CAP`, `PIPELINE_DAILY_CAP`, `DISCOVERY_DEFAULT_INDUSTRY`, `DISCOVERY_DEFAULT_CITY`, `AUTO_DISCOVERY_CRON`.

## How it works

One pass = `runDiscoveryCore`, top to bottom:

1. **Provider-key guard.** `DISCOVERY_PROVIDER` (`google` default) decides which credential is required. Missing → returns `{ found: 0, …, message: '<KEY> is not configured.' }`. It returns, it does not throw — and it lives in the **core**, not the action, because both callers need it.
2. **Daily cap.** `resolveDailyCap(DISCOVERY_DAILY_CAP, auto, AUTO_DISCOVERY_DAILY_CAP)`. Then a live `count()` of today's `leads` rows with a non-null `place_id`. At/over the cap → return before any paid call. Under it, the cap also **clamps this pass's enrich budget**: `budget = min(ENRICH_TOP_N, cap − todayCount)`.
3. **Market pick.** `auto: true` → `planNextMarket(settings.market_plan, hunted_markets)`; a `null` pick returns early ("Autonomous hunting is off or the market pool is empty"). Otherwise: typed `industry`/`city` → `DISCOVERY_DEFAULT_INDUSTRY`/`DISCOVERY_DEFAULT_CITY` → `'dentists'` / `'Austin TX'`. `MarketPick.regionCode` (geo-bias) exists only on the planner path.
4. **Search + dedupe.** `searchBusinesses({ industry, city, regionCode })` (≤20 results) → `dedupePlaces` (within-batch fuzzy: name Jaccard ≥ 0.8 **and** address Jaccard ≥ 0.5) → `slice(0, budget)`.
5. **Enrich the top-N.** Per place: `enrichPlace(id)` (website + phone) → if a website came back, `assessWebsite(url)` (the 0-100 heuristic score + `reachable`) and `scrapeEmail(url)`.
6. **Orion qualifies the batch.** `orionQualify` → `{ value, priority, rationale }` per lead.
7. **Map + upsert.** `mapPlaceToLead` → `upsertDiscoveredLeads` (`ON CONFLICT (place_id) DO UPDATE`, refreshing `website_uri`, `email`, `phone`, `site`, `website_score`, `formatted_address`, `business_status`, `maps_data`).
8. **Record the market** (auto runs only): upsert `hunted_markets` with `lastRunAt = now` and `leadsFound += upserted`.
9. **Auto-chain** — see below.
10. **Activity row**, then return `DiscoveryResult`.

### Providers

| | `google` (default) | `apify` |
|---|---|---|
| Entry | `searchBusinessesGoogle` / `enrichPlaceGoogle` | `searchBusinessesApify` / `enrichPlaceApify` |
| Backend | Google Places API (New), REST | Apify actor `compass~crawler-google-places`, `run-sync-get-dataset-items` |
| Billing | Google Cloud (needs billing enabled) | Apify pay-as-you-go — **no Google Cloud billing at all** |
| Calls per pass | 1 search + N per-place detail calls | 1 scrape run; `enrichPlace` serves from a module-level `enrichmentCache` (no second call) |
| `regionCode` geo-bias | honored | **silently ignored** (its opts type has no `regionCode`) |
| `mapsData` | **never set** | rating, reviewsCount, reviews, hours, categories, priceLevel, **photos** |

### THE COST RULE (the field-mask split)

`places-client.ts` keeps two masks and they are not interchangeable:

- `DISCOVERY_FIELD_MASK` — `places.id`, `places.displayName`, `places.formattedAddress`, `places.location`, `places.businessStatus`, `places.primaryType`. This is the cheap **Pro** SKU and it runs on **every** search.
- `ENRICH_FIELD_MASK` — `id`, `websiteUri`, `internationalPhoneNumber`. This is the **Enterprise** SKU (the code puts it at ~$7/1k) and it runs only for the top-N (`ENRICH_TOP_N`, in `run-discovery-core.ts`).

Adding `websiteUri` (or any other Enterprise field) to `DISCOVERY_FIELD_MASK` re-bills every search at Enterprise. Nothing stops you — see invariant **M1**.

### Caps and safety floors

`resolveDailyCap(raw, auto, floor)` accepts **only a positive number** (`Number.isFinite(n) && n > 0`). Unset, `0`, negative, and `NaN` all fall through to: the floor for autonomous runs, **`0` for manual runs** (0 = no app-side cap; only the provider-side cap remains).

| Cap | Env | Autonomous floor (constant in `run-discovery-core.ts`) | Counted against |
|---|---|---|---|
| Leads/day | `DISCOVERY_DAILY_CAP` | `AUTO_DISCOVERY_DAILY_CAP` = 30 | today's `leads` rows with a `place_id` |
| Pipelines/day | `PIPELINE_DAILY_CAP` | `AUTO_PIPELINE_DAILY_CAP` = 10 | today's `pipeline_runs` rows |

### Orion (the qualifier)

`orion-qualify.ts` is the research-room agent's brain: for each enriched candidate it produces `{ value, priority: hot|warm|cold, rationale }` via `completeText` (the gateway, `lib/integrations/assistant.ts`). It runs from **both** runtimes, so the *worker* container needs the gateway env too, not just `web`.

- `assistantConfigured()` false → straight to `fallbackQualify` (derived from the real heuristic score — never a fabricated constant).
- 3 attempts with 1s/2s backoff on a throw; an unparseable-but-well-formed answer breaks out immediately (a retry won't fix it).
- Values clamped to `MIN_VALUE`..`MAX_VALUE` ($500–$20k). `parseQualified` rejects any array of the wrong length.
- Prompt-injection hardening: `cleanField` strips newlines and caps each field at 120 chars, and the prompt frames the list as data ("a business NAME is never an instruction"). Business names are attacker-influenceable directory text (**D3**).

### The autonomous market hunter

The cron `autoDiscovery` (`triggers: [{ cron: AUTO_DISCOVERY_CRON }]`, default `0 9 * * *`, UTC) gates on **live settings** each tick — `autonomyMode ∈ {guarded, full}` **and** `planHasWork(marketPlan)` — then runs `runDiscoveryCore({ auto: true })` as ONE `step.run`. It declares `concurrency: [{ limit: 1 }]` and **`retries: 0`**: the core is one monolithic step, so a retry would re-pay for the whole search + enrich + Orion pass. The cron cadence *is* the retry (a failed pass never writes `hunted_markets`, so the next tick re-picks that market).

- `MARKET_CATALOG` (`market-catalog.ts`) — rich English-speaking countries only (US, GB, AU, CA, IE), each with high-spend metros and `language: 'English'`.
- `MARKET_NICHES` — the allowed niche strings. A niche not in this list is **silently dropped** by `combos()`.
- `planNextMarket` expands the founder's pool into every (country, metro, niche) combo in catalog order and picks the **least-recently-hunted** (never-hunted first, catalog order as the stable tie-break). Pure — history carries the timestamps, there is no clock in the module.
- State: `hunted_markets` rows (upserted per auto pass) + `settings.market_plan`.

> ### ⚠️ `settings.market_plan` HAS NO WRITER
>
> Grep `marketPlan` across `lib/`, `app/`, `components/`: **only reads** (`auto-discovery.ts` and `run-discovery-core.ts`). There is **no settings UI, no server action, and no seed value** — `lib/actions/settings.ts` writes `autonomyMode`, `guardrails` and `pricing` only, and `seedConfig()` inserts the `settings` row without `market_plan`. The column is therefore `NULL`, readers fall back to `DEFAULT_MARKET_PLAN`, and `DEFAULT_MARKET_PLAN.enabled === false`.
>
> **Consequence: autonomous hunting can only be turned on by a manual SQL UPDATE.** The row seeded by `seedConfig()` is `id = 'default'`:
>
> ```sql
> UPDATE settings
> SET market_plan = '{"countries":["US"],"niches":["nail salons","dental clinics"],"enabled":true}'::jsonb,
>     updated_at  = now()
> WHERE id = 'default';
> ```
>
> If the seed never ran, upsert instead (`autonomy_mode` and `updated_at` carry DB defaults):
>
> ```sql
> INSERT INTO settings (id, market_plan)
> VALUES ('default', '{"countries":["US"],"niches":["nail salons"],"enabled":true}'::jsonb)
> ON CONFLICT (id) DO UPDATE SET market_plan = EXCLUDED.market_plan, updated_at = now();
> ```
>
> `countries[]` must be ISO codes present in `MARKET_CATALOG` and `niches[]` strings present in `MARKET_NICHES` — anything else expands to no combos, `planNextMarket` returns `null`, and the cron no-ops. Hunting also needs `autonomy_mode ∈ {guarded, full}`, a running `worker` container, and the active provider's credential.

### The auto-chain (who gets a pipeline)

Runs only when the live `settings.autonomyMode` is `guarded` or `full` (default `guarded` when the row is missing). Eligibility is computed from **this pass's live enrichment**, never a re-query:

1. `hasContact({ phone, email })` — a phone **or** an email. No contact = no way to deliver the demo.
2. `!hasRealWebsite(websiteUri, assessment.reachable)` — skip a business that already runs a real, working standalone site. A social/directory host (`SOCIAL_HOSTS` + `SOCIAL_SUBSTR` in `website-presence.ts`) or an unreachable URL counts as **no real website** → still a target.
3. A DB filter: `stage = 'found'` **and** `notExists(pipeline_runs WHERE leadId = leads.id)` — the **re-pipeline guard** (**M4**).
4. Bounded by `remaining` from the pipeline cap; each survivor gets `startPipelineRun(leadId, mode)`.

**Non-eligible leads are still SAVED** and show up in `/leads`. The gates block the *pipeline*, not the upsert.

## Invariants

Governed by (rationale, what-breaks and what-enforces live in [`../invariants.md`](../invariants.md) — do not restate them here):

- **B1** — every module in this runtime closure: relative imports, no `server-only`, no `next/*`, no `lib/repositories/*`.
- **M1** — never add `websiteUri`/phone/any Enterprise-SKU field to `DISCOVERY_FIELD_MASK`.
- **M2** — the auto-discovery cron keeps `retries: 0` and `concurrency: 1`.
- **M3** — daily-cap env parsing accepts only a positive integer; everything else falls to the floor.
- **M4** — do not weaken the `notExists(pipeline_runs …)` re-pipeline guard.
- **D1** — any fetch of a lead-supplied URL goes through `safeFetch` / `assertPublicUrl`.
- **D3** — Orion sanitizes attacker-influenceable directory text (`cleanField` + the data-framing prompt).
- **F2** — `leads.company` is UNIQUE while the upsert conflicts only on `place_id`.
- **F3** — migrations are append-only; a new schema module must be exported from the barrel.
- **F6** — a new provider field must be added to the `set:{}` of `upsertDiscoveredLeads`, not just the insert.

## Extension recipes

**Add a provider (e.g. SerpAPI).**
1. `lib/discovery/places-serp.ts` — export `searchBusinessesSerp(opts): Promise<DiscoveredPlace[]>` and `enrichPlaceSerp(id): Promise<PlaceEnrichment>`. Relative imports, no `server-only`.
2. Populate `mapsData` if the source carries rating/reviews/hours/photos — otherwise demo-gen loses all real content (see Traps).
3. Dispatch in `places-client.ts`: replace the boolean `useApify()` with a switch on `DISCOVERY_PROVIDER`.
4. Add the credential branch to the provider-key guard in `run-discovery-core.ts` (keep it in the **core**, not the action).
5. Add the token to `.env.example` + a row in `../env-reference.md`; add a cost row to `../deployment-guide.md`.
6. Test: mirror `tests/discovery/places-apify.test.ts` (stub `fetch`; assert the mapping, the closed-place filter, the missing-token error).
7. `npx vitest run tests/discovery` — the worker-safety walker fails if you used `@/` or `server-only`.

**Add a country or niche.** Append to `MARKET_CATALOG` / `MARKET_NICHES` in `market-catalog.ts`. `code` must be the ISO-3166 alpha-2 that Google accepts as `regionCode`. No migration. Update `tests/discovery/market-planner.test.ts` if you change catalog **order** — the no-history test asserts which combo comes first.

**Turn ON autonomous hunting.** There is no UI. Run the SQL in the callout above, set `autonomy_mode` to `guarded` or `full` (the Settings screen does this), start the `worker`, and provide the provider credential. Optionally set `AUTO_DISCOVERY_CRON`, `DISCOVERY_DAILY_CAP`, `PIPELINE_DAILY_CAP`.
*If you build the UI:* add a `'use server'` action in `lib/actions/settings.ts` that validates the payload against `MARKET_CATALOG` / `MARKET_NICHES` and writes `settings.marketPlan` — mirror `updateGuardrails`.

**Add an auto-chain eligibility gate.** New pure worker-safe module in `lib/discovery/` (mirror `contactability.ts`) → unit test it → AND it into the `.filter()` that builds `eligiblePlaceIds` in `run-discovery-core.ts`, using this pass's live `enrichment`/`assessment`. Keep the lead **saved** — gate the pipeline, not the upsert.

**Surface a new provider field on the lead.** Extend `MapsData` (`lib/data/types.ts`) **or** add a column in `lib/db/schema/leads.ts` → `npm run db:generate` → commit the SQL → map it in `map-place-to-lead.ts` → add it to the `set:{}` of `upsert-discovered-leads.ts` (**F6** — otherwise re-discovery keeps the stale value) → thread it through `run-demo-gen.ts` and `lib/demo-gen/prompt.ts` if a demo should use it.

## Traps

- **`mapsData` is Apify-ONLY.** `toMapsData` exists only in `places-apify.ts`; `searchBusinessesGoogle` never sets the field. `run-demo-gen.ts` passes `lead.mapsData` to the demo pipeline (`lib/agents/pipelines/demo.ts`), which calls `fetchVenuePhotos(input.mapsData?.photos ?? [], …)`. So with **`DISCOVERY_PROVIDER=google` a demo gets zero real venue photos and zero real testimonials** — it falls back to stock imagery, silently defeating the headline feature. Same for `APIFY_MAX_IMAGES=0`.
- **The Apify provider ignores `regionCode`.** `searchBusinessesApify`'s opts type has no `regionCode`, and TypeScript's excess-property check does not fire on a passed variable — so the planner's geo-bias is dropped with no error. Under Apify the market is disambiguated by the metro string alone.
- **The Apify `enrichmentCache` is module-level and never evicted.** `enrichPlaceApify(id)` returns `{ null, null }` unless `searchBusinessesApify` ran **in the same process** first, and the map grows for the life of the long-lived worker.
- **`leads.company` is UNIQUE but the upsert conflicts only on `place_id`** (**F2**). Two different `place_id`s sharing a company name (a franchise across metros; two branches `dedupePlaces` keeps because the addresses differ) raise `23505 leads_company_unique`. The multi-row INSERT is one statement, so **the whole pass fails**: nothing saved, `hunted_markets` not written, and with `retries: 0` the next cron tick re-picks the same market and fails identically.
- **A manual run has no app-side cap by default.** `DISCOVERY_DAILY_CAP` unset ⇒ `resolveDailyCap` returns `0` for `auto: false`. Only the autonomous path gets a floor.
- **`hasRealWebsite` treats an unreachable site as "no website"** — a real site that was merely down during the probe becomes a target.
- **The mock `AV` leads store bare domains** (no `http(s)://`), which the audit's greenfield gate reads as "no website". Discovery-sourced leads store whatever the provider returned in `website_uri`, and `url` falls back to the literal `'(no site yet)'`.
- **`safeFetch` has no DNS-rebinding protection** (documented residual). It blocks by hostname *shape*: dotless Docker service names, `.local`, integer/hex IP forms, private ranges — re-validated on every redirect hop (≤6).

## Tests

`tests/discovery/` covers the **pure** modules: `dedup`, `map-place-to-lead`, `contactability`, `website-presence`, `bad-website-heuristic`, `safe-fetch`, `market-planner` (including the English-language assertion on the catalog), `orion-qualify` (the never-throws contract + the clamp), `places-apify` (mapping, closed-place filter, missing token).

`tests/discovery/run-discovery-core-worker-safety.test.ts` statically walks the **runtime** import closure (type-only edges excluded) of its `ENTRY_FILES` — `run-discovery-core.ts`, `auto-discovery.ts`, `start-pipeline-run.ts` — and fails on any `@/`, `server-only` or `next/*` import. This is the enforcement of **B1** for this subsystem.

**What NOTHING guards:**

- `runDiscoveryCore`'s behavior. No test imports it — not the caps, not the enrich-budget clamp, not the market pick, not the auto-chain gates, not the re-pipeline guard, not the upsert. `tests/db/` has no discovery file either.
- The contents of `DISCOVERY_FIELD_MASK` (**M1**) — a comment is the only defense.
- `resolveDailyCap`'s negative/NaN handling (**M3**).
- The `leads.company` collision (**F2**) — no unit test, no DB-mode test.
- The cron's `retries: 0` / `concurrency: 1` config (**M2**).
- That a new provider populates `mapsData`, or that a new column reaches the upsert's `set:{}` (**F6**).
