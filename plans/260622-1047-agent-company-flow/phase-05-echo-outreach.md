# Phase 5 — Echo outreach + Resend (key trả phí MỚI duy nhất)

**Mục tiêu:** Soạn + gửi email outreach VN cá nhân hóa kèm link demo, gate bởi autonomy mode. Bước **gửi email thật đầu tiên** — bề mặt pháp lý/deliverability.

**Phụ thuộc:** Phase 4. **Key-gated:** **`RESEND_API_KEY`** (key trả phí mới duy nhất của cả dự án) + tuân thủ CAN-SPAM + tier volume outreach.

## Files tạo mới / sửa
- `lib/integrations/resend.ts` — client gửi email **worker-only**; bắt buộc header `From / ReplyTo / unsubscribe`. Echo + Mira dùng chung.
- `lib/agents/defs/echo-outreach.ts` — persona outreach VN (sonnet) → `makeJsonValidator {subject, body}`. Tone target = `lib/data/index.ts:344`.
- `lib/inngest/functions/run-outreach.ts` — `runAgent(echo)` soạn → **GỬI gate sau `requiresApproval`** (đây là bước có thể "lỡ tay" gửi email xấu) → advance `leads.stage='contacted'`/`demo='sent'`; emit `outreach/sent`.
- `lib/actions/send-outreach.ts` — guard `USE_DB` + `RESEND_API_KEY` → `inngest.send('outreach/requested')`; **degrade thành toast** khi thiếu key.
- `lib/inngest/client.ts` — `OutreachRequestedData`.
- `lib/repositories/agent-activity.ts` — overlay OUTREACH (echo) đọc trạng thái gửi.
- `lib/actions/run-discovery.ts` — dưới guarded/full, **auto-`startPipeline` mỗi lead** mới upsert (tôn trọng `DISCOVERY_DAILY_CAP` + cap pipeline/ngày mới). → khép vòng "tự tìm lead rồi tự chạy".

## Các bước
1. `resend.ts` client (header tuân thủ).
2. Persona Echo + def + output JSON.
3. `run-outreach.ts`: draft → gate gửi → advance stage.
4. `send-outreach.ts` action (guard key, degrade).
5. Sửa `run-discovery` auto-start pipeline (chỉ guarded/full, có cap).

## Acceptance
- 4 gate xanh **không cần Resend** (degrade-without-key phải pass). `test:db` cho stage advance.
- **Hành vi (có key test):** chạy pipeline tới outreach → ở guarded mode DỪNG chờ founder duyệt nội dung email → approve → email thật gửi qua Resend, lead lên `contacted`. Không key → action trả message "cần RESEND_API_KEY", không vỡ.
- Auto-chain: `run-discovery` ở manual KHÔNG tự chạy; ở guarded tự chạy nhưng tôn trọng cap.

## Rủi ro / rollback
- **Gửi email thật = rủi ro cao nhất:** luôn gate gửi sau approval ở guarded; CAN-SPAM (unsubscribe/From thật); rate-limit theo tier Resend.
- Burst: auto-chain discovery batch → cap `CLAUDE_AGENT_CONCURRENCY` + cap run/ngày.
- Rollback: bỏ `RESEND_API_KEY` → Echo degrade về toast, phần còn lại chạy bình thường tới demo.
