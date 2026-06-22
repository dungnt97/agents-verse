# Phase 2 — Pipeline ledger + orchestrator (auto-hop audit→demo)

**Mục tiêu:** Giới thiệu đối tượng "run", orchestrator trung tâm, và máy chuyển trạng thái thuần; nối **auto-hop thật ĐẦU TIÊN** (`audit/completed → demo/requested`) end-to-end dưới autonomy gate.

**Phụ thuộc:** Phase 1. **Key-gated:** không mới (cần DB để CHẠY, nhưng typecheck/build vẫn xanh với `USE_DB=false`; orchestrator không gọi claude).

## Files tạo mới
- `lib/db/schema/pipeline-runs.ts` — bảng `pipeline_runs` (vé job xuyên suốt): `id, leadId, stage (pipelineStageEnum), status (pipelineRunStatusEnum: running|waiting_approval|paused|done|failed), autonomySnapshot, startedAt, updatedAt, …` + **partial-unique index** trên `leadId WHERE status in ('running','waiting_approval','paused')` (double-start = no-op). Migration qua `db:generate` + `db:migrate`.
- `lib/inngest/pipeline-machine.ts` — **PURE** `decideNextHop(lastEvent, run, settings) → {emit|gate|done|stop}` (client-safe, không I/O) + unit tests (theo style `deal-stage-machine` test).
- `lib/inngest/functions/orchestrate-pipeline.ts` — router trung tâm: nghe mọi `*/completed`/fact event, đọc run + **live settings**, gọi `decideNextHop`, emit lệnh kế tiếp hoặc mở gate. `concurrency:[{limit:1,key:'event.data.runId'}]`.
- `lib/inngest/functions/run-agent.ts` — durable fn generic chạy 1 agent (`getAgent`+`runAgent` trong 1 memoized step) cho các agent không có fn riêng.
- `lib/actions/start-pipeline.ts` — `startPipeline(leadId)` + `pausePipelineRun(runId)` (auth + `USE_DB` gated, send-event-only).
- `lib/repositories/pipeline-runs.ts` — đọc server-only, fallback `[]` khi `!USE_DB`.

## Files sửa
- `lib/db/schema/ops.ts` — thêm cột **nullable `runId`** vào `escalations`. Migration.
- `lib/inngest/client.ts` — thêm `PipelineEvent {runId, leadId}` + union `PipelineEventName`; `AuditRequestedData`/`DemoRequestedData` thêm `runId`.
- `lib/inngest/functions/run-audit.ts` + `run-demo-gen.ts` — mang `runId` xuyên suốt; **kết thúc bằng `step.sendEvent('audit/completed' | 'demo/completed', {...})`** (orchestrator quyết bước kế).
- `lib/inngest/worker-entrypoint.ts` — đăng ký `orchestrate-pipeline`, `run-agent`.
- Thêm cap toàn cục `CLAUDE_AGENT_CONCURRENCY` (default 1–2) vào concurrency của MỌI fn chạy claude.

## Các bước
1. Schema `pipeline_runs` + migration; thêm `runId` vào escalations + migration.
2. Viết `pipeline-machine.ts` (pure) + unit tests cho các hop hợp lệ/bất hợp lệ.
3. `start-pipeline.ts` tạo run + emit event đầu (`audit/requested`).
4. Sửa `run-audit`/`run-demo-gen` mang `runId` + emit `*/completed`.
5. `orchestrate-pipeline.ts` nối `audit/completed → demo/requested` (chỉ hop này ở phase này).

## Acceptance
- 4 gate xanh (`USE_DB=false`). `npm run test:db` cho unit của pipeline-machine + ledger.
- **Hành vi:** `startPipeline(leadId)` → audit chạy → tự động kích demo → cả 2 đều ghi đúng vào `pipeline_runs` (stage chuyển audit→demo). Quan sát run row + dashboard.
- At-least-once: gửi trùng `audit/completed` → KHÔNG double-advance (conditional write).

## Rủi ro / rollback
- **Idempotency:** mọi ghi stage `SET stage WHERE stage = expected-from`; `step.sendEvent` memoized.
- **Đụng tên:** KHÔNG để bảng run trong `pipeline.ts` (đã tồn tại). Migration giữ idempotent.
- Rollback: orchestrator chưa nối outreach/sales → revert chỉ mất auto-hop audit→demo, các subsystem vẫn trigger tay được.
