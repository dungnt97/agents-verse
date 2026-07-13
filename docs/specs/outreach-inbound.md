# Outreach & Inbound — Spec

> How a discovered lead is actually contacted, and how their reply gets back in. Owner-of-truth for: the outreach
> channel dispatcher and its four channels, the legal/ban posture of each channel, the outbound-email contract
> (List-Unsubscribe + idempotency), Echo's send-vs-gate flow in `run-outreach`, and the inbound webhooks.

## Boundary

**In scope**

| Concern | Files |
|---|---|
| Channel dispatch | `lib/integrations/outreach-channel.ts` |
| Email out | `lib/integrations/resend.ts` |
| WhatsApp Cloud (official) | `lib/integrations/whatsapp.ts` |
| Telegram Bot API (notify + ack only) | `lib/integrations/telegram.ts` |
| Telegram userbot (personal) | `lib/integrations/telegram-user.ts`, `scripts/telegram-user-login.ts` |
| WhatsApp personal (Baileys) | `lib/integrations/whatsapp-personal.ts`, `scripts/whatsapp-personal-login.ts` |
| Send/gate worker | `lib/inngest/functions/run-outreach.ts` |
| Inbound parse + verify | `lib/integrations/{resend-inbound,whatsapp-inbound,telegram-inbound}.ts` |
| Inbound routes | `app/api/{inbound,whatsapp,telegram}/route.ts` |
| Dead server actions | `lib/actions/{send-outreach,ingest-reply}.ts` (see **Traps**) |

**Out of scope** — what happens to a reply once `reply/received` is emitted (the Closer, the deal machine, Mira's
onboarding email, proposals): `./deals-proposals-delivery.md`. The pipeline hop that emits `outreach/requested` and the
escalation/approval machinery: `./pipeline-orchestrator.md`. Echo's prompt as an agent: `./agents-runtime.md`. Env var
meaning/placement: `../env-reference.md`. The founder-facing assistant (`app/api/chat/route.ts`) is **not** an outreach
channel and is not covered here.

**Runtime** — every *outreach* send runs in the **worker** container only (`run-outreach` → `outreach-channel.ts`); the
heavy personal clients (GramJS, Baileys) are `await import`ed so they never enter the web bundle. The webhook routes run
in **web**: the two reply webhooks verify a signature, read the DB and `inngest.send` — nothing else. (`/api/telegram` is
the exception: it touches neither the DB nor Inngest and calls the Bot API directly from web via `telegram.ts` — a
fetch-only module, so this does not violate B2.)

## Contracts

### The channels

`OUTREACH_CHANNEL` selects one (`outreachChannel()`); the value is lowercased/trimmed, and an **unknown value silently
falls back to `email`**.

| `OUTREACH_CHANNEL` | Transport | Recipient field | What actually goes out | Official? | Unsubscribe line? |
|---|---|---|---|---|---|
| `email` (default) | Resend REST | `lead.email` | Echo's `{subject, body}` wrapped by `outreachEmailHtml` | yes | **yes** (header + footer) |
| `whatsapp` | WhatsApp Cloud API (Meta Graph) | `lead.phone` | the **approved template** named by `WHATSAPP_TEMPLATE_NAME`, params `{{1}}=company`, `{{2}}=demoUrl` — *not* Echo's draft | yes | **no** |
| `telegram-user` | GramJS / MTProto **userbot** on a personal account | `lead.phone` (or an `@username`) | free-form text: Echo's body + the demo URL + a `Reply STOP to opt out.` line | **no** | **keyword** (`STOP`) |
| `whatsapp-personal` | Baileys (WhatsApp Web multi-device) on a personal account | `lead.phone` | free-form text: Echo's body + the demo URL + a `Reply STOP to opt out.` line | **no** | **keyword** (`STOP`) |

Recipient selection is `recipientForChannel(lead)`: `email` → `lead.email`; **every other channel → `lead.phone`**.
Phone normalisation is **per-adapter, not shared** — there is no single choke point:

- `whatsapp.ts` (`toE164Digits`) — strips non-digits and a leading `00`, then requires `/^[1-9]\d{7,14}$/`. A national
  trunk-prefix number is **rejected, never guessed**: the send returns `{ok:false}` rather than dialing a wrong number.
- `whatsapp-personal.ts` — **re-implements the same rule inline** (same strip + same regex, same `{ok:false}`); it does
  **not** call `toE164Digits`. Change one and the other silently diverges.
- `telegram-user.ts` — **validates nothing.** `sendTelegramUser` prepends `+` to the digits and imports the number as a
  temporary contact; a leading-`0` national number is passed through as `+0…` and only fails at Telegram (`no Telegram
  account for …`). Nothing rejects it up front.

**Telegram Bot API is deliberately NOT an outreach channel.** A bot cannot DM a stranger who has not messaged it
first, so `telegram.ts` exists only to (a) `notifyTelegram` the team chat and (b) auto-acknowledge someone who
messages the bot. It **never emits `reply/received`**.

### Legal / ban posture (this is code-enforced policy, not advice)

- **`whatsapp` (official):** a cold first touch **MUST** be a pre-approved template. `sendWhatsAppTemplate` is the
  only function `sendOutreach` calls for cold contact. `sendWhatsAppText` (free-form) is valid **only inside the 24h
  customer-service window after the lead messages us** — using it cold gets the sender number banned.
- **`telegram-user`:** a *personal* Telegram account — mass cold messaging trips PEER_FLOOD and can get the account
  banned. Use a secondary account, keep volume low.
- **`whatsapp-personal`:** an unofficial client, **against WhatsApp's ToS**; Meta bans cold/bulk numbers fast. **Use a
  burner number.**
- **Both personal channels carry a good-faith keyword opt-out, not CAN-SPAM machinery** (`plainOutreachText` = Echo's
  body + the demo URL + a `Reply STOP to opt out.` line — the two channels have no `List-Unsubscribe` header, so the
  keyword is the whole opt-out). An inbound `STOP` is then honored end-to-end: the Closer sets the lead's `doNotContact`
  flag (and clears the parked outreach draft), and `loadSendable` refuses that lead forever after — see **Outbound** and
  `./deals-proposals-delivery.md`. **Only the email path carries CAN-SPAM machinery.** If you add a compliance
  requirement, it lands in `plainOutreachText` — there is nowhere else.

### Outbound email contract (`sendEmail`)

- `resendConfigured()` ⇔ `RESEND_API_KEY` **and** `OUTREACH_FROM` are both set. Missing → `{ok:false, error}`; the
  sender **never throws**.
- **Commercial mail carries `List-Unsubscribe` + `List-Unsubscribe-Post`; transactional mail must NOT.** The header
  pair is emitted **iff** `input.unsubscribe` is present. `outreachEmailHtml` (commercial: demo CTA + visible
  unsubscribe footer) vs `supportEmailHtml` (transactional: body only, no CTA, no footer, used by Mira onboarding and
  the proposal email).
- **Every real send carries a stable `idempotencyKey`** → the `Idempotency-Key` header: `outreach:<leadId>`,
  `support:<leadId>`, `proposal:<dealId>`. A step retry must not double-send.
- ⚠ **The three message channels have NO provider idempotency.** `sendWhatsAppTemplate` / `sendTelegramUser` /
  `sendWhatsAppPersonal` take no key — a send-step retry after a lost response **re-sends**. Accepted for these
  off-by-default v1 channels; gate behind a persisted per-lead sent-marker before any volume.

### Events

| Event | Direction | Payload | Emitted by | Consumed by |
|---|---|---|---|---|
| `outreach/requested` | in | `OutreachRequestedData { leadId, runId? }` | the orchestrator (`STAGE_REQUEST_EVENT` / `RESUME_HOP`) | `run-outreach` |
| `outreach/approved` | in | `OutreachApprovedData { leadId, subject, body, runId? }` | `approveOutreachEscalation` | `run-outreach` |
| `outreach/sent` | out | `OutreachSentData { leadId, runId?, outcome?:'ok'\|'failed' }` | `run-outreach` (`emit-sent` ×2, `emit-skip` ×3, `onFailure`) + `rejectOutreachEscalation` / `takeOverEscalation` | the orchestrator (closing fact) |
| `reply/received` | out | `ReplyReceivedData { dealId, leadId?, text }` — the two webhooks always populate `leadId` (the Closer needs it to create the deal / honor an opt-out) | `/api/inbound`, `/api/whatsapp` (and the dead `ingestReply`) | `handle-reply` |

### Env vars (names only — meaning + placement live in `../env-reference.md`)

`OUTREACH_CHANNEL` · `RESEND_API_KEY` `OUTREACH_FROM` `OUTREACH_REPLY_TO` · `APP_URL` (falls back to
`BETTER_AUTH_URL`) · `WHATSAPP_PHONE_NUMBER_ID` `WHATSAPP_ACCESS_TOKEN` `WHATSAPP_TEMPLATE_NAME`
`WHATSAPP_TEMPLATE_LANG` `WHATSAPP_VERIFY_TOKEN` `WHATSAPP_APP_SECRET` · `TELEGRAM_BOT_TOKEN` `TELEGRAM_CHAT_ID`
`TELEGRAM_WEBHOOK_SECRET` · `TELEGRAM_API_ID` `TELEGRAM_API_HASH` `TELEGRAM_USER_SESSION` ·
`WHATSAPP_PERSONAL_AUTH_DIR` · `RESEND_INBOUND_SECRET` · `CLAUDE_AGENT_CONCURRENCY`.

## How it works

### Outbound (`run-outreach`)

Triggers: `outreach/requested` **and** `outreach/approved`. `retries: 1`; concurrency = the shared
account-scoped `claude`-agent budget (`{scope:'account', key:'"claude-agent"', limit:CLAUDE_AGENT_CONCURRENCY}`,
default 2 — one queue across all five `claude`-CLI functions, not a per-function ceiling) **plus**
`{limit:1, key:'event.data.leadId'}` per-lead serialization.

1. **`loadSendable(leadId)`** — one guard shared by both trigger paths. It skips (never throws) when: the active channel
   is unconfigured (`outreachChannelConfigured()`), no absolute public origin is set (`APP_URL`/`BETTER_AUTH_URL` both
   unset — a relative `/demo/<id>` link would be dead), the lead is missing, `lead.doNotContact` is set (opted out — a
   hard suppression that survives across runs), `lead.demo === 'sent'`, `lead.stage !== 'found'`, there is no recipient
   for the channel, or there is no `ready` row in `generated_demos`.
2. **Draft.** On `whatsapp` the draft is `whatsappPreview(...)` — a *deterministic* description of the template and its
   resolved params, because the approved template's wording is what the prospect receives and an Echo email draft would
   be reviewed then thrown away. Every other channel: `step.run('draft')` → `runAgent(echoOutreach, …)`, memoized,
   written in `demoLanguageForAddress(lead.formattedAddress)` (the lead's market language).
3. **Send or gate.** `autonomyMode === 'full'` → `sendVia` → `markSent`. Anything else → park the draft as escalation
   `esc-outreach-<leadId>` (`title`=subject, `rec`=body, `runId` carried) via `onConflictDoUpdate` with
   `setWhere: status <> 'dismissed'`; `.returning()` tells us whether a row actually opened.
4. **`sendVia`** builds `demoUrl = ${appUrl()}/demo/${leadId}` and `unsubscribe` = a **mailto** to `OUTREACH_REPLY_TO ??
   OUTREACH_FROM ?? unsubscribe@localhost`, then calls `sendOutreach()`. A `{ok:false}` result is **thrown** so the step
   retries.
5. **`markSent`** is one transaction: `stage:'contacted'` **only** `WHERE stage='found'`, `demo:'sent'`
   unconditionally, and resolve any open `esc-outreach-<leadId>` so a stale draft cannot be approved into a second send.
6. **Approval** — `approveOutreachEscalation` emits `outreach/approved` (carrying the escalation's
   `subject`/`body`/`runId`) **before** resolving the row; `run-outreach` re-runs `loadSendable` (the lead may have
   moved), then sends.

Every terminal path emits `outreach/sent` — the two send paths (`emit-sent`), the three skip paths (`emit-skip`:
approved-but-no-longer-sendable, nothing-to-send, previously-dismissed) and `onFailure`. That is what stops a run
stranding at `outreach`. The id is `` `outreach/sent:${runId ?? leadId}` `` on the in-function emits and
`` `outreach/sent:${runId}` `` in `onFailure`; the **skip and failure emits fire only when the event carried a `runId`**
(a manual, run-less outreach emits no fact when it skips). The gated path emits nothing — it is not terminal, it waits
for the founder.

### Inbound — exactly two webhooks reach the Closer

| Route | Auth | Freshness | Disabled when unset |
|---|---|---|---|
| `app/api/inbound/route.ts` (Resend email) | Svix HMAC over `${id}.${timestamp}.${payload}`, constant-time, multi-signature (key rotation) | `svix-timestamp` within **±300s** | `RESEND_INBOUND_SECRET` → **503** |
| `app/api/whatsapp/route.ts` (Cloud API) | `X-Hub-Signature-256` = HMAC-SHA256(`WHATSAPP_APP_SECRET`, rawBody), constant-time | the message's own `timestamp` within **±300s** — checked **after** parsing, and **skipped entirely when the message carries no timestamp** | `WHATSAPP_APP_SECRET` → **404** |

Shared shape (copy it for any new inbound channel):

1. `export const dynamic = 'force-dynamic'`.
2. **`await req.text()` FIRST** — the signature is over the exact bytes; verify **before** `JSON.parse`.
3. Reject a stale timestamp (**400**) — `X-Hub-Signature-256` signs no timestamp, so the message timestamp is the
   only replay defense there (and the email route's `svix-timestamp` is checked *before* parsing, the WhatsApp
   message timestamp only after).
4. `if (!USE_DB) return 200`.
5. Map sender → `leads`, then look up that lead's `deals` row. Email matches `leads.email`; WhatsApp matches
   `regexp_replace(leads.phone, '[^0-9]','','g')` against the wa_id digits (discovery stores phones formatted). A known
   lead with **no deal yet** — the normal case for a freshly-discovered lead's first reply — is still emitted for, using
   a deterministic `deal-<leadId>`; the Closer (`handle-reply`) then materializes the deal from it (see
   `./deals-proposals-delivery.md`). So there IS an inbound path to a deal for a discovered lead — the
   reply→deal→delivery half of the funnel is reachable.
6. **Only an unknown sender (no matching lead) → 200 `ignored`, never 5xx** — a 5xx makes the provider retry forever. A
   *known* lead is always emitted for, deal or not.
7. `inngest.send({ name:'reply/received', id: \`reply/received:<dealId>:<providerMsgId>\` })` — `svix-id` / `wamid`
   makes at-least-once delivery idempotent.

`parseInboundEmail` **rejects any payload whose `type` is not received/inbound** — Resend posts `email.sent` /
`delivered` / `bounced` for *our own* outbound mail to the same endpoint, and those carry **our** From address; without
this check they would be fed back in as a "reply" (a self-reply loop). A typeless payload is allowed (shape drift).
`parseWhatsAppInbound` returns `null` for status-only events and non-text messages.

`app/api/telegram/route.ts` is the third webhook and is **not** an inbound *reply* path: it constant-time-compares
`X-Telegram-Bot-Api-Secret-Token`, dedupes `update_id` in a bounded in-memory `Set`, auto-replies in the sender's chat,
and mirrors the message to `TELEGRAM_CHAT_ID`. It emits no Inngest event.

**There is no inbound path for `telegram-user` or `whatsapp-personal`.** A reply to a userbot/Baileys DM lands in a
personal account that nothing reads programmatically. Choosing a personal channel means choosing to read replies by
hand.

## Invariants

Rationale + what-breaks live in `../invariants.md` — do not restate them here.

- **B1** — every `lib/integrations/*` module is on the worker chain: relative imports, no `server-only`.
- **B2** — web routes/actions may only `inngest.send`; never import `lib/inngest/functions/*` or `lib/agents/*`.
- **C1** — every terminal path in `run-outreach` (skip, dismissed, failure, success) MUST emit its `outreach/sent` fact.
- **C2** — that fact's event id is keyed by `runId`; the success emit and the `onFailure` emit deliberately share it.
- **C6** — approve/reject actions `inngest.send` **before** marking the escalation resolved.
- **C8** — `esc-outreach-<leadId>` is a load-bearing key; approval recovers the lead by stripping the prefix.
- **D2** — verify the signature over the RAW body before parsing; ±300s freshness; 200 for unknown senders.
- **D3** — cap inbound text at `MAX_REPLY_CHARS` + the Closer's data fence. (The WhatsApp parser does **not** cap
  today — see **Traps**; D3's "every ingest boundary" wording overstates the code.)
- **D4** — only genuine inbound events may reach the Closer.
- **D8** — cold official WhatsApp must be a template; the personal channels are ban/ToS risk, carrying only a keyword
  (`STOP`) opt-out, not `List-Unsubscribe` headers.
- **D9** — commercial mail carries `List-Unsubscribe`, transactional must not; every real send carries an
  `idempotencyKey`.
- **O3** — only `autonomyMode === 'full'` sends unattended; any new channel must replicate the gate.
- **O5** — never cold-contact a lead whose `stage !== 'found'` or `demo === 'sent'`; never resurrect a dismissed draft.
- **R3** — the five `claude`-CLI functions share ONE account-scoped concurrency budget; a new `claude` function
  must reuse the same `scope`+`key` (`'account'` / `'"claude-agent"'`), never a keyless fn-scoped limit.

## Extension recipes

**Add a new outreach channel (e.g. SMS)**

1. `lib/integrations/<ch>.ts`: export `<ch>Configured(): boolean` and a send fn returning `{ok, error?}` — **never
   throw**. Relative imports, no `server-only`; `await import` any heavy SDK.
2. `lib/integrations/outreach-channel.ts`: add the literal to `OutreachChannel` **and** `CHANNELS`, a case in
   `outreachChannelConfigured`, the recipient field in `recipientForChannel` if it is not email, and a `case` in
   `sendOutreach`.
3. If the channel forbids free-form cold contact, add a deterministic preview like `whatsappPreview` so the founder
   reviews what actually goes out, and branch the draft selection in `run-outreach`.
4. Fix the skip message in `loadSendable` — today it says `lead has no email` for anything that is not `whatsapp`.
5. Decide the idempotency story: no provider key ⇒ a retry re-sends.
6. Add the vars to `.env.example` **and** `../env-reference.md`; add a dispatch case to
   `tests/integrations/outreach-channel.test.ts` and a configured/unconfigured guard test mirroring
   `tests/integrations/personal-adapters.test.ts`.

**Add a new inbound channel (reply → Closer)**

1. `lib/integrations/<ch>-inbound.ts`: a pure verifier (`node:crypto`, `timingSafeEqual`) + a pure parser that caps the
   body at `MAX_REPLY_CHARS`.
2. `app/api/<ch>/route.ts`: follow the shared shape above verbatim. Never import the worker chain from a route.
3. Unit-test the verifier (good / tampered / wrong secret / missing header) and the parser (real message, status event,
   junk) — mirror `tests/integrations/whatsapp-inbound.test.ts`.

**Add a new outbound email**

1. Commercial → `outreachEmailHtml` + pass `unsubscribe`. Transactional to an existing client → `supportEmailHtml`, no
   `unsubscribe`.
2. Always pass a stable `idempotencyKey`; guard with `resendConfigured()` and return a `{skip}` rather than throwing.
3. Send only from the worker; the web side emits the event and key-gates with a toast.

## Traps

- ⚠ **`APP_URL` (and `BETTER_AUTH_URL`) unset ⇒ outreach silently sends NOTHING.** A relative `/demo/<leadId>` link is
  a dead link, so `loadSendable` now refuses the send and returns a skip (`appUrl()` = `''` fails its `^https?://`
  check) rather than mail a broken link. The failure mode flipped from "every message ships a dead link" to "every run
  skips at the guard" — set an absolute public origin before the first real send or nothing goes out. `appUrl()` also
  trims a trailing slash so the link is `<origin>/demo/<id>`, never `<origin>//demo/<id>`.
- ⚠ **Dead code — there is no founder-paste UI.** `lib/actions/send-outreach.ts` (`sendOutreach`) and
  `lib/actions/ingest-reply.ts` (`ingestReply`) have **zero callers outside `tests/db/`**; `ingest-reply.ts` says so
  itself ("has NO UI calling it today — wire one up (or delete it)"). In production `outreach/requested` comes from the
  orchestrator and `reply/received` from the two webhooks. Without `RESEND_INBOUND_SECRET`, *email* replies never reach
  the Closer at all (WhatsApp replies have their own gate, `WHATSAPP_APP_SECRET`). Don't copy these actions —
  `send-outreach.ts` is also **channel-blind** (it gates on `RESEND_API_KEY` + `OUTREACH_FROM` + `lead.email` regardless
  of `OUTREACH_CHANNEL`, so on a phone channel it wrongly blocks); the worker's `outreachChannelConfigured()` /
  `recipientForChannel()` is the correct guard.
- ⚠ **The WhatsApp inbound parser does NOT cap the body.** `parseInboundEmail` and `ingestReply` slice to
  `MAX_REPLY_CHARS`; `parseWhatsAppInbound` does not — attacker-controlled text goes onto the Inngest event bus at full
  length, and only the Closer's prompt builder truncates it. Cap it at the parser when you touch that file.
- ⚠ **Unsubscribe is a `mailto:` nobody processes.** There is no suppression list, no unsubscribe route, no table. A
  recipient who clicks it emails a human. Adding volume without a suppression store is the next compliance gap.
- ⚠ **`sendWhatsAppText` has no production caller** (only `tests/integrations/whatsapp.test.ts`). It exists for the 24h
  reply window and is *not* safe for cold contact — the export is a loaded gun. Likewise **the Closer's suggested reply is never actually sent on any channel**
  (`handle-reply` only writes the deal and opens an escalation); a "reply to the client" feature does not exist yet.
- ⚠ **`notifyTelegram` has exactly one caller — the Telegram webhook itself.** Despite its "push pipeline events to the
  founder" comment, no pipeline function calls it. There is no ops-notification wiring today.
- ⚠ **Echo writes in the lead's market language; the Closer and Mira are hardcoded Vietnamese.** An English-market lead
  gets an English cold email and then a Vietnamese suggested reply / onboarding email.
- ⚠ **Echo has no degrade path when the `claude` CLI is missing** — it throws and retries. `run-outreach`'s terminal
  failure emits a failed fact but opens **no** escalation (unlike `handle-reply` / `run-support` / `send-proposal`), so
  a permanently-broken CLI silently fails runs with nothing in the review queue.
- ⚠ **Meta's template params are positional.** `sendOutreach` fills `{{1}}=company`, `{{2}}=demoUrl`. A template
  approved with a different parameter order sends nonsense — nothing validates the template against the params.

## Tests

**Guarded today** (`npm run test`, no DB/keys needed):

- `tests/integrations/outreach-channel.test.ts` — channel parsing (incl. unknown → `email`), `recipientForChannel`,
  `outreachChannelConfigured`, and the dispatch of all four channels (email carries subject/body/unsubscribe/
  idempotency; whatsapp sends the template with `[company, demoUrl]`; both personal channels send free-form text ending
  in a `Reply STOP to opt out.` line).
- `tests/integrations/resend-send-email.test.ts` — degradation without keys, `Idempotency-Key`, and that
  `List-Unsubscribe` headers appear **only** when `unsubscribe` is passed.
- `tests/integrations/{resend-inbound,whatsapp-inbound}.test.ts` — signature verification (good, tampered, wrong secret,
  rotated keys, missing headers) and parsing (incl. the non-inbound-type rejection and status-only events).
- `tests/integrations/{whatsapp,telegram,telegram-inbound,personal-adapters}.test.ts` — `toE164Digits`, the send
  wrappers, and that the personal adapters degrade without importing their SDK when unconfigured.

**NOT guarded — assume it is broken until you check by hand:**

- **No test imports `run-outreach`** (or any Inngest function — `tests/discovery/run-discovery-core-worker-safety.test.ts`
  only walks source text). The send-vs-gate autonomy branch, every `outreach/sent` emit path, the `setWhere status <>
  'dismissed'` rule, and `markSent`'s conditional stage advance are covered by **nothing**. `tests/db/outreach.test.ts`
  exercises the *dead* `sendOutreach` action, not the worker.
- **No test hits the three route handlers.** Only the pure verifier/parser helpers they call are tested — the
  freshness window, the 200-for-unknown-sender rule, the `!USE_DB` early return, and the phone-digits SQL match are
  untested.
- **Nothing asserts the demo URL is absolute** (`loadSendable`'s `APP_URL`/`BETTER_AUTH_URL` guard has no run-outreach
  test) or that the WhatsApp template params are in the order the approved template expects. (The outreach-channel test
  *does* now assert both personal channels append the `Reply STOP to opt out.` line.)
