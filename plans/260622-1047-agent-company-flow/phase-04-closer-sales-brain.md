# Phase 4 — Closer sales brain (deal tự tiến qua reply founder-paste)

**Mục tiêu:** Cho deal state machine THẬT một bộ não: diễn giải 1 reply của khách, route qua `requiresApproval`, auto-advance hoặc escalate. **Đòn bẩy cao nhất**, không cần key mới. Ingest bằng founder-paste trước (chưa cần kênh inbound).

**Phụ thuộc:** Phase 3. **Key-gated:** không mới (chạy trên `CLAUDE_CODE_OAUTH_TOKEN`). Webhook inbound hoãn P6.

## Files tạo mới / sửa
- **Thêm dependency `zod`** (chỉ dùng cho output gate state-machine, không dùng cho event payload — giữ quy ước cast-at-call-site của `client.ts`).
- `lib/agents/validators.ts` — thêm `makeJsonValidator(zodSchema)` (strip fence → `JSON.parse` → `schema.parse`).
- `lib/agents/defs/closer-sales.ts` — persona diễn giải reply (sonnet) → output zod `{kind, interpretation, suggested, recommendedStage (DealStage), conf}`. `recommendedStage` PHẢI là `DealStage` hợp lệ — sai thì validator throw, không bao giờ âm thầm đẩy deal.
- `lib/inngest/functions/handle-reply.ts` — `runAgent(closer)` → `requiresApproval()` → auto-advance deal hoặc chèn escalation deal-linked (tái dùng `approveDealEscalation`); emit `deal/quoted | won | lost`.
- `lib/actions/ingest-reply.ts` — reply founder dán vào → `inngest.send('reply/received', {...})`.
- `lib/inngest/client.ts` — `ReplyReceivedData`.
- `lib/inngest/pipeline-machine.ts` — wire hop `outreach/replied` + `deal/quoted` qua `decideNextHop`.
- Unit tests: conf thấp / vượt ngưỡng LUÔN escalate (không bao giờ bypass `DEAL_CONF_FLOOR`).

## Các bước
1. Thêm zod + `makeJsonValidator`.
2. Viết persona Closer + def + output schema (= shape `DemoReply` ở `types.ts`).
3. `handle-reply.ts`: interpret → gate → advance/escalate qua deal-stage-machine có sẵn.
4. `ingest-reply.ts` action (founder paste) + event.
5. Tests cho gate (low-conf/over-threshold → escalate).

## Acceptance
- 4 gate xanh + `test:db` cho gate logic.
- **Hành vi:** dán 1 reply "OK em, giá bao nhiêu?" → Closer phân loại intent, đề xuất `quoted`, conf cao → deal tự tiến `quoted`; dán reply "Đắt quá / để anh nghĩ" → escalate cho founder. Reply mơ hồ/conf thấp → luôn escalate.

## Rủi ro / rollback
- LLM mis-step đẩy sai deal → chặn bằng zod `DealStage` + `requiresApproval` + `DEAL_CONF_FLOOR` (3 lớp).
- Chưa có kênh inbound → founder-paste là đủ để dùng + test; webhook P6.
- Rollback: tắt `handle-reply` registration → deal về điều khiển tay (state machine vẫn nguyên).
