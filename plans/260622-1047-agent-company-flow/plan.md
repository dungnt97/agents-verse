# Plan: Hệ thống agents tự hành như một công ty web outsource

**Trạng thái:** Draft — chờ founder duyệt trước khi build. Chưa code.
**Ngày:** 2026-06-22
**Nguồn:** thiết kế từ workflow `design-agent-company` (4 kiến trúc sư đọc codebase thật + tổng hợp).

> Quy ước: prose tiếng Việt; mọi tên file/định danh/đoạn code/lệnh giữ nguyên English.

---

## 1. Mục tiêu (vision)

Biến Agents Verse thành **một web agency tự hành thật**, chạy trọn phễu như công ty outsource:

```
Discovery → Audit → Demo → Outreach → Sales-reply → Deal/CRM → Delivery
```

Mỗi bước là **một agent có tên, có bộ não riêng** (1 định nghĩa prompt/skill có kiểu), thực thi qua `claude` CLI trong worker (chạy bằng gói subscription, không API key), được **Inngest** nối thành 1 pipeline event-driven, **throttle bởi autonomy mode** của founder, và **gate bởi con người** qua `escalations` + Review Center đã có. Mỗi lượt chạy ghi vào sổ `pipeline_runs` để dashboard phản ánh ĐÚNG agent nào đang làm gì.

## 2. Nguyên tắc nền tảng

Hệ thống được xây bằng cách **tổng quát hóa 3 tài sản đã chứng minh**, KHÔNG phát minh máy móc mới:

1. **Agent runtime + registry** ← engine demo-gen đa-persona (`runClaude`/`resultText`/`extractHtml` trong `lib/demo-gen/generate.ts`). Đây là "cách gọi 1 agent" — chỉ cần nhấc ra dùng chung.
2. **Mẫu durable function** ← `run-audit.ts` (memoized steps, global + per-id concurrency, mark-failed re-throw) → template cho mọi agent worker mới.
3. **Một engine autonomy/approval duy nhất** ← `deal-stage-machine.ts` + `escalations` + `requiresApproval()` → cả phễu route qua đây.

**Bất biến bắt buộc:**
- **Dual-mode thiêng liêng:** `USE_DB=false` → dashboard showcase y nguyên (đọc roster tĩnh `lib/data/index.ts`); mọi action mới `{ok:false}`-degrade khi thiếu DB/key; agent mới không "live" ở mock mode.
- **Ranh giới web ↔ worker giữ nguyên:** web KHÔNG bao giờ import `lib/agents/*` / engine / durable functions; web chỉ `inngest.send(...)`. `lib/agents/*`, `pipeline-machine.ts`, mọi `functions/*` dùng **relative imports + KHÔNG `server-only`** (chạy dưới tsx — `server-only` THROW, alias `@/` không resolve).
- **Tiền:** chỉ **Resend (email)** cần key trả phí mới; mọi thứ khác chạy trên `CLAUDE_CODE_OAUTH_TOKEN` sẵn có.
- **Giới hạn thật KHÔNG phải tiền mà là Claude-CLI BURST:** demo-gen đã bắn tới 8 lượt opus tuần tự/lead → auto-chain 1 batch lead có thể vắt cạn rate/usage subscription + treo VPS. Khắc phục: 1 cap toàn cục `CLAUDE_AGENT_CONCURRENCY` (default 1–2) dùng chung mọi claude fn + cap số run/ngày + auto-chain TẮT ở mode manual/review (founder chủ động bật burst).

## 3. Kiến trúc — 3 trụ cột + 1 quyết định lớn

| Trụ cột | Cách làm |
|---|---|
| **Agent Registry** (`lib/agents/`) | Mỗi agent = `AgentDef<I,O>` { id, role, room, model, systemPrompt(input), skills, tools, limits, output-validator }. Tổng quát hóa `REVIEW_PERSONAS.{key,brief}` + các builder `buildDirectorPrompt/buildBuildPrompt`. `prompt.ts` GIỮ làm thư viện nội dung; `defs/*` IMPORT lại, không nhân bản. |
| **Orchestrator** (`orchestrate-pipeline` + `pipeline-machine.ts`) | **QUYẾT ĐỊNH: dùng orchestrator TRUNG TÂM**, không fan-out rải rác. 1 durable fn nghe mọi event `*/completed`, đọc run + live settings, gọi PURE `decideNextHop(...)` → emit lệnh kế tiếp hoặc mở gate. Worker fn "ngu": làm việc → emit 1 fact event. Lý do: pause/kill-switch per-run + gate→resume + "snapshot autonomy nhưng quyết theo live settings" cần 1 điểm quyết định duy nhất. |
| **Gate engine** (`escalations` + Review Center) | MỌI gate ghi 1 row `escalations` (bảng có sẵn, thêm cột nullable `runId` cạnh `dealId`). Nút approve/reject của founder → trigger RESUME pipeline. Deal gate giữ `requiresApproval()` nguyên văn. |

**Sổ run — QUYẾT ĐỊNH đặt tên:** `lib/db/schema/pipeline.ts` ĐÃ TỒN TẠI (là schema audit đổi tên: audits/demos/generatedDemos/deals). Bảng run mới đặt ở **file mới** `lib/db/schema/pipeline-runs.ts`, tên bảng `pipeline_runs` — vé job xuyên suốt + neo idempotency + sổ status/cost từng bước.

### Module map (đích cuối)
```
lib/agents/                 # MỚI — worker-tsx-safe (relative imports, no server-only)
  types.ts        AgentDef<I,O>, AgentId, AgentModel, AgentContext, AgentResult, OutputValidator
  runner.ts       runAgent(def,input,ctx) + runBoard(defs,...)  ← lift runClaude
  registry.ts     AGENTS: Record<AgentId, AgentDef> + getAgent(id)
  validators.ts   makeHtmlValidator() · makeJsonValidator(zodSchema) · makeTextValidator()
  board.ts        REVIEW_BOARD: AgentId[]
  defs/           1 file/agent (atlas, nova, iris, kira, echo, closer, …)
  pipelines/demo.ts   re-impl generateDemoHtml qua registry (hành vi y hệt)
lib/inngest/
  client.ts                  + PipelineEvent{runId,leadId} + PipelineEventName + Outreach/ReplyReceivedData
  pipeline-machine.ts  MỚI — PURE decideNextHop(lastEvent, run, settings)
  functions/orchestrate-pipeline.ts · run-agent.ts · run-outreach.ts · handle-reply.ts   (MỚI)
  functions/run-audit.ts · run-demo-gen.ts   (EDIT: mang runId, kết bằng step.sendEvent('*/completed'))
  worker-entrypoint.ts       (EDIT: đăng ký fn mới)
lib/db/schema/pipeline-runs.ts  MỚI (pipeline_runs + enums + partial-unique active index)
lib/db/schema/ops.ts            EDIT (thêm nullable runId vào escalations)
lib/actions/start-pipeline.ts · send-outreach.ts · ingest-reply.ts   (MỚI, send-event-only)
lib/actions/escalations.ts · run-discovery.ts   (EDIT)
lib/repositories/pipeline-runs.ts  MỚI · agent-activity.ts  EDIT (overlay echo/closer/cipher)
lib/integrations/resend.ts         MỚI (worker-only, Echo+Mira dùng chung)
app/api/inbound/route.ts           MỚI (phase 6 — Resend inbound webhook)
```

## 4. Org chart — 11 agent (REAL / PARTIAL / TO-BUILD)

| Agent | Vai trò | Nguồn prompt tái dùng | model | Trạng thái |
|---|---|---|---|---|
| **Vega** | Website Critic (audit) | `vision-scoring.ts` | gemini | ✅ REAL (chỉ thêm handoff) |
| **Atlas** | Brand Strategist (spec) | `buildDirectorPrompt`+`artDirectionFor` | opus | ✅ REAL (tách def) |
| **Nova** | UI Designer (build HTML) | `buildBuildPrompt`+`craftConstraints` | opus | ✅ REAL (tách def) |
| **Iris** | UX Reviewer | `REVIEW_PERSONAS.uiux` | opus | ✅ REAL (board persona) |
| **Kira** | Visual QA (pass/hold gate) | `REVIEW_PERSONAS.art` | opus | ✅ REAL (board persona) |
| **Orion** | Lead Hunter | discovery deterministic + LLM re-rank | haiku | 🟡 PARTIAL (re-rank mỏng) |
| **Closer** | Sales Closer (reply→deal) | persona MỚI, shape=`DemoReply` | sonnet | 🟡 PARTIAL — **đòn bẩy cao nhất** (state machine có, thiếu não + ingest reply) |
| **Cipher** | Frontend Coder (build-prep) | persona MỚI | opus | 🟡 PARTIAL (mới có label) |
| **Ledger** | Finance (cost meter) | đếm `pipeline_runs` × rate + LLM tóm tắt | haiku | 🟡 PARTIAL (escalation có) |
| **Echo** | Outreach (email) | persona MỚI VN | sonnet | 🔴 TO-BUILD (Subsystem 4 + Resend) |
| **Mira** | Support (assets/care) | persona MỚI | sonnet | 🔴 TO-BUILD |

Mỗi agent emit `conf`; output conf thấp → route vào `escalations` + Review Center. `agent-activity.ts` (đã làm overlay audit/demo/discovery) sẽ thêm overlay outreach/closer/cipher khi từng subsystem lên.

## 5. Phân phase (build theo thứ tự — mỗi phase là 1 PR an toàn)

| # | Phase | Mục tiêu | Phụ thuộc | Key-gated | File |
|---|---|---|---|---|---|
| 1 | Agent runtime + registry | Nhấc engine demo-gen thành runtime dùng chung; re-express demo pipeline qua nó, hành vi y hệt. Pure refactor. | — | — | [phase-01](phase-01-agent-runtime-registry.md) |
| 2 | Pipeline ledger + orchestrator | Bảng `pipeline_runs` + orchestrator trung tâm + `decideNextHop`; nối auto-hop ĐẦU TIÊN (audit→demo) dưới gate. | P1 | — | [phase-02](phase-02-orchestrator-ledger.md) |
| 3 | Human-in-the-loop gates | Mọi hop rủi ro gate qua escalations/Review Center; nút founder = resume/halt; kill-switch toàn cục. | P2 | — | [phase-03](phase-03-approval-gates.md) |
| 4 | Closer sales brain | Cho deal state machine 1 bộ não: đọc reply (founder-paste) → requiresApproval → auto-advance hoặc escalate. | P3 | — | [phase-04](phase-04-closer-sales-brain.md) |
| 5 | Echo outreach + Resend | Soạn+gửi email VN kèm link demo, gate bởi autonomy. Bước GỬI email thật đầu tiên. | P4 | **RESEND_API_KEY** + CAN-SPAM | [phase-05](phase-05-echo-outreach.md) |
| 6 | Delivery + inbound + finance | Cipher build-prep (won), Mira support, Resend inbound webhook, Ledger cost meter. Đóng vòng. | P5 | RESEND (inbound) | [phase-06](phase-06-delivery-finance.md) |

**Khuyến nghị thứ tự ưu tiên:** P1→P2→P3 cho "xương sống tự chạy + an toàn"; P4 (Closer) là đòn bẩy cao nhất không cần key mới; P5/P6 cần Resend.

## 6. Rủi ro chính & cách giảm

1. **Claude-CLI burst** (giới hạn trung tâm, KHÔNG phải tiền): 1 cap toàn cục `CLAUDE_AGENT_CONCURRENCY` dùng chung mọi claude fn + cap run/ngày (Ledger) + auto-chain TẮT ở manual/review.
2. **Auto-chain bỏ checkpoint người:** MỌI auto-advance route qua `requiresApproval`; guarded mode gate demo-before-client + outreach-send + deal-close; KHÔNG bao giờ bỏ qua `DEAL_CONF_FLOOR`; `recommendedStage` của Closer validate bằng zod (giá trị sai không thể âm thầm đẩy deal).
3. **Chưa có kênh nhận reply:** ship Closer với reply founder-paste trước (P4), webhook inbound để P6 — não không kẹt vì kênh chưa có.
4. **Hazard import tsx:** `lib/agents/*` + `pipeline-machine.ts` + mọi fn dùng relative + no `server-only`; web không import.
5. **At-least-once → event trùng:** mọi ghi stage là conditional (`SET stage WHERE stage = expected-from`) + `onConflictDoUpdate`; partial-unique active-run index → double-start = no-op.
6. **Đụng tên schema:** `pipeline.ts` đã tồn tại → bảng run mới ở `pipeline-runs.ts`/`pipeline_runs`. Chuỗi migration giữ idempotent cho Docker seed.

## 7. Quyết định của founder (2026-06-22) — đã chốt

1. **Autonomy mặc định go-live:** ✅ **Guarded** — tự chạy discover→audit→demo+review; gate người duyệt trước khi gửi email khách hoặc chốt/báo giá deal.
2. **Kênh nhận reply:** ✅ **Founder-paste ở P4 → Resend inbound webhook ở P6.** Closer brain không kẹt chờ kênh inbound.
3. **Hosting demo build:** ✅ **Serve từ DB** (`/demo/[leadId]`). Cipher chỉ tối ưu SEO/OG/sitemap; để ngỏ host riêng khi khách thật yêu cầu domain riêng.
4. **Volume outreach / Resend:** ✅ **Thấp — free tier** (<100 email/ngày), warm-up domain. Unsubscribe + header `List-Unsubscribe` + From/ReplyTo thật là mặc định bắt buộc. Nâng gói khi cần.
5. **Cost meter (Ledger):** ✅ **Ước theo token tương đương API** — rate mặc định opus ~$0.30/run · sonnet ~$0.08 · haiku ~$0.01, chỉnh trong Settings. Margin có ý nghĩa + hữu ích để cân nhắc subscription vs API.

## 8. Cách verify mỗi phase (gate chất lượng)
- Mỗi phase kết thúc phải qua: `npm run typecheck` + `npm run lint` + `npm run test` + `npm run build` (đều xanh không cần DB/key — chuẩn dual-mode).
- Phase có DB: thêm `npm run test:db` (ephemeral postgres).
- Hành vi: mỗi phase chứng minh bằng 1 lượt chạy thật (trigger lead → quan sát dashboard/`pipeline_runs`), giống cách đã verify Subsystem 3.
