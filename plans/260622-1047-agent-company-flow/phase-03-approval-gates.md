# Phase 3 — Human-in-the-loop gates + founder pause/kill-switch

**Mục tiêu:** Mọi hop rủi ro đều gate được qua `escalations` + Review Center có sẵn; nút approve/reject của founder **resume hoặc halt** pipeline. Nối gate "demo-before-client" + kill-switch toàn cục.

**Phụ thuộc:** Phase 2. **Key-gated:** không.

## Files sửa
- `lib/inngest/functions/orchestrate-pipeline.ts` — khi `decideNextHop` trả `gate`: gọi `openPipelineEscalation(kind:'pipeline', runId, …)` + set `pipeline_runs.status='waiting_approval'`. Orchestrator đọc **live settings mỗi hop** (snapshot autonomy lúc start nhưng quyết theo settings hiện tại).
- `lib/actions/escalations.ts` — resolve/approve/reject **emit thêm** `pipeline/resumed | pipeline/halted` (và `deal/won | deal/lost` cho deal escalation) → orchestrator tiếp tục/đừng run.
- `lib/inngest/pipeline-machine.ts` — wiring gate rows: **guarded/review** gate demo-before-client (không gửi cho khách trước khi founder duyệt demo); **manual** gate mọi thứ; **full** auto qua (vẫn không bỏ `DEAL_CONF_FLOOR`).
- `lib/repositories/agent-activity.ts` — đọc `pipeline_runs.stage` để roster hiện agent nào đang lái lead nào (mở rộng overlay đã có).
- Review Center (component) — render escalation `kind:'pipeline'` mà KHÔNG giả định có `dealId` (kiểm tra không phụ thuộc cứng `dealId`).
- Settings `autonomyMode` — xác nhận là **kill-switch toàn cục live**: đổi sang Manual → orchestrator dừng mở hop mới.

## Các bước
1. `openPipelineEscalation` + `waiting_approval` trong orchestrator.
2. Sửa `escalations.ts` action: approve/reject emit event resume/halt.
3. Wire các gate trong `decideNextHop` theo autonomy mode.
4. Đảm bảo Review Center hiển thị escalation pipeline (không cần deal).
5. Overlay `agent-activity` đọc stage của run.

## Acceptance
- 4 gate xanh + `test:db` cho logic gate (guarded gate demo-before-client; manual gate mọi hop).
- **Hành vi:** chạy 1 pipeline ở guarded mode → tới bước "gửi cho khách" thì DỪNG, tạo 1 escalation pipeline; founder bấm approve ở Review Center → pipeline resume; bấm reject → halt. Đổi autonomy sang Manual giữa chừng → run đang chờ không tự tiến.
- KHÔNG bao giờ bỏ qua `requiresApproval`/`DEAL_CONF_FLOOR` (unit test khẳng định).

## Rủi ro / rollback
- Gate phải atomic ở 1 điểm (orchestrator) — đó là lý do chọn orchestrator trung tâm.
- Rollback: nếu gate lỗi, set autonomy=Manual = dừng toàn bộ auto-hop (kill-switch là chính nó).
