# Product Vision

**What this file owns:** why this product exists — the thesis, who it serves, the funnel it runs, and the
principles the code is meant to honor.
**What it does not own:** what is built and what is not. **This document makes no status claims.** Build state
lives in `development-roadmap.md`, and only there. Behavior lives in `specs/`.

## 1. The thesis

> *“We don’t send proposals. We send working demos.”*

The traditional local-web-agency motion is a discovery call, a proposal deck, and a two-to-three week wait —
during which the prospect is asked to imagine the result. Agents Verse inverts it: the prospect sees the finished
thing first, then decides. The public promise is a live, working redesign of *their* site (or a first site, if
they have none) **within 48 hours**, built from their real address, phone number, venue photos and reviews — not a
template with their logo dropped in.

That inversion only pays if the work costs almost nothing to produce. So the product is an **autonomous agency**:
an AI workforce finds the businesses, audits them, builds the demo, sends it, reads the reply, and carries the
conversation to a signed deal — while a single human founder keeps approval and financial control.

Two consequences run through the whole codebase and should survive every refactor:

- **A demo is worthless if it lies.** Invented phone numbers, stock photos standing in for a real dining room,
  fabricated testimonials — each one converts the demo from an asset into an embarrassment. Real facts flow from
  the lead row into the generation prompt, and the prompts say *never invent* in as many words. See
  `specs/demo-gen.md`.
- **Autonomy without guardrails is a liability, not a feature.** Every outbound action a stranger will see is
  either founder-approved or explicitly delegated. See §4.

## 2. Who it is for

**Primary — the founder / solo agency operator.** The authenticated workspace is their command surface, not a team
tool. They want leverage, not a job: approve the demos worth sending, approve the deals worth signing, watch what
the AI is spending, tune the guardrails. The product's core UX bet is that *the founder's attention is the scarcest
input in the system* — the escalation queue is how it gets rationed, and everything they do not need to see should
never reach them.

**Secondary — the prospect (a local business owner).** They never log in. They receive a demo of their own business
and an outreach message, or they submit a request themselves through the public modal. They are busy, skeptical,
and have been cold-pitched by agencies before — which is exactly why the first thing they get is a working site
rather than a sales letter. Their market is English-speaking by design (demo copy defaults to English; a Vietnamese
address is the one exception).

**Anticipated but not modeled — a small operating team.** Per-agent toggles and an autonomy ladder imply future
delegation to more than one human. Only the single-founder model is designed today.

## 3. The funnel

One end-to-end pipeline. Each stage has a screen, a data model, and a spec.

1. **Find.** Hunt local businesses whose web presence is weak or absent. A lead carries a current-site score, an
   estimated redesign value, and — critically — a way to reach a human. A business with no phone and no email is
   still stored, but it is never worked: contactability is what decides whether the pipeline auto-starts on it, so
   an unreachable prospect never costs a demo. → `specs/discovery.md`
2. **Audit.** Score the current site on `visual`, `mobile`, `cta`, `trust`, `seo`, `speed`, `content` and
   `conversion`, name the concrete problems, and produce a redesign brief that fixes them. A business
   with *no* site gets the same treatment in reverse: a first-website brief. → `specs/audit.md`
3. **Generate the demo.** Build a real, viewable page — grounded in the audit's brief and the business's real
   facts. This is the product. Everything upstream exists to make it possible; everything downstream exists to get
   it in front of someone. → `specs/demo-gen.md`
4. **Reach out.** Send the demo through whichever channel actually reaches this owner. The message is a link to
   something that already exists, which is the entire pitch. → `specs/outreach-inbound.md`
5. **Read the reply.** Interpret an inbound reply — interest, objection, a request for a human — with a stated
   confidence, and either advance the deal or escalate it. Low confidence is a reason to ask the founder, never a
   reason to guess. → `specs/deals-proposals-delivery.md`
6. **Close and deliver.** Quote, package, price. On acceptance, the demo becomes a delivery build and the client
   moves into a production timeline (intake → content → production → QA → client review → delivered → care).
   → `specs/deals-proposals-delivery.md`

The spine that holds it together is a single durable run per lead, with the founder's gates in the middle of it.
→ `specs/pipeline-orchestrator.md`

## 4. Controlled autonomy

The founder sets one posture, and it governs how far the machine walks before it stops and asks.

| Mode | Posture |
|---|---|
| `manual` | The AI suggests. The founder approves every action. |
| `review` | The AI prepares the work. The founder approves anything that leaves the building. |
| `guarded` | The AI completes low-risk work on its own. The founder approves risk. (The default.) |
| `full` | The AI acts within the rules and escalates only what crosses a guardrail. |

The postures above are the founder-facing copy. What the pipeline machine actually enforces today is coarser:
`manual` and `review` behave identically (no stage auto-chains — the founder advances every hop), and only
`guarded`/`full` let the pre-client work flow on its own. The `review` promise is not yet a code-level distinction.

Escalations are the product's pressure-relief valve: a deal above the value threshold, an AI-spend warning, an
explicit request to talk to a human, an output the model itself is not confident in. Each carries a severity, a
reason, the AI's recommendation, and its confidence — so the founder is deciding, not re-deriving.

The design rule this implies, and which the code enforces: **anything a stranger will see must pass a gate unless
the founder has explicitly delegated it.** Unattended outbound sending happens in `full` and nowhere else.

## 5. Surfaces

**Public.** A landing page carrying the thesis (the traditional-vs-us contrast, how it works, a look inside the
agency floor, why it wins, pricing, trust and safety), info pages, a self-serve demo-request modal, and the
generated demo itself — served standalone on its own hardened route, so a prospect can open it without an account.
(The nav still links a `#showcase` anchor that no section renders — a dead link, not a missing intent.)

**Workspace (login-gated).** The founder's floor: an overview with the headline metrics and the live escalation
queue, a command center for what needs a decision, the agent roster and the rooms they work in, and one screen per
funnel stage — leads, audits, demos, deals, requests, activity, settings.

The landing page, the floor overview, and the command center are the project's **design bar**. Every other screen
should look like it belongs beside them.

## 6. Design principles

- **Show, don't propose.** Every artifact the prospect touches should be the real thing, not a description of it.
- **Real facts or no facts.** A missing photo is better than a stock photo. A missing testimonial is better than
  an invented one.
- **The founder's attention is the budget.** Escalate what crosses a guardrail; absorb everything else silently.
- **Degrade, never crash.** Any capability that needs a key must fall back to something honest when the key is
  absent — the product has to run, and demo, with zero credentials.
- **Self-hosted by default.** One VPS, no managed services, no per-seat SaaS in the critical path. The cost model
  only works if running the agency is nearly free.
- **The UI is hand-tuned and stays that way.** A CSS-variable design system, no framework, no restyling. UI
  fidelity is treated as a contract, not a preference.
- **English-first market.** Copy, demos, and outreach target English-speaking markets; the Vietnamese locale is a
  first-class second language, not an afterthought.

## 7. What good looks like

Goals, not measurements taken from the system.

- A prospect goes from never-heard-of-us to looking at a working redesign of their own business inside 48 hours.
- The founder reviews only what crosses a guardrail, and can say yes or no without opening a second tab.
- The demo is the pitch: the before/after score jump is real, and the page would be shippable if they said yes today.
- Running the agency for a day costs less than a coffee.

## Open product questions

- Are the autonomy defaults, the value threshold, the cost cap and the confidence floor the numbers the business
  commits to, or seeds waiting for real data?
- Is multi-seat in scope, or is the single-founder model permanent for v1?
- Is Vietnamese a launch market or a demonstration of the i18n capability?
