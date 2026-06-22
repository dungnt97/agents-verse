# Phase 6 — Delivery agents + inbound channel + finance meter (khép vòng)

**Mục tiêu:** Đóng phễu: Cipher build-prep cho deal won, Mira hỗ trợ/thu thập asset khách, Resend inbound webhook để reply về tự động, Ledger đo cost từ `pipeline_runs`.

**Phụ thuộc:** Phase 5. **Key-gated:** `RESEND_API_KEY` (inbound webhook). **Câu hỏi mở:** đích hosting cho demo Cipher build (xem `plan.md` §7).

## Files tạo mới / sửa
- `lib/inngest/functions/run-build.ts` (Cipher) — sau `deal/won`/demo approved: tách demo self-contained thành build deploy được + SEO/OG meta + sitemap; emit `delivery/completed`. Cần bảng/artifact `builds` (hoặc cột trên demo).
- `lib/agents/defs/cipher-coder.ts` (persona build-prep, tools `['Bash']`) + `mira-support.ts` (persona thu asset/care, sonnet).
- Luồng asset-request của Mira qua `lib/integrations/resend.ts` (dùng chung).
- `app/api/inbound/route.ts` — **Resend inbound webhook** → emit `reply/received` (thay founder-paste làm kênh chính; Closer P4 tự nhận reply).
- `lib/agents/defs/ledger-finance.ts` — cost meter: **đếm `pipeline_runs` × rate ước lượng** (subscription không có per-token) → emit escalation `cost` khi >80% budget (shape đã seed). LLM chỉ tóm tắt mỏng (haiku).
- `lib/repositories/agent-activity.ts` — overlay cho cipher/mira/ledger.
- `lib/inngest/pipeline-machine.ts` — wire hop `deal/won → delivery`.

## Các bước
1. `run-build.ts` + bảng `builds` + persona Cipher.
2. Mira asset-request flow (Resend).
3. Inbound webhook route → `reply/received`.
4. Ledger cost meter (đếm runs × rate) + cost escalation.
5. Overlay 3 agent cuối + wire delivery hop.

## Acceptance
- 4 gate xanh (degrade không key). `test:db` cho cost-meter + delivery hop.
- **Hành vi:** deal won → Cipher build-prep chạy, emit delivery; reply gửi tới inbound URL → tự vào Closer (không cần paste); Ledger báo escalation khi vượt 80% budget; dashboard 11 agent đều phản ánh thật.
- Toàn flow end-to-end: discover → audit → demo → outreach → reply → deal → delivery, mỗi bước gate theo autonomy.

## Rủi ro / rollback
- **Hosting demo build** chưa chốt → mặc định giữ serve từ DB (`/demo/[leadId]`) tới khi founder quyết host riêng.
- Inbound webhook = bề mặt bảo mật (verify chữ ký Resend).
- Cost rate là ước lượng (subscription) → ghi rõ là ước tính, không phải hóa đơn thật.
- Rollback: từng agent độc lập — tắt registration của fn nào thì subsystem đó về tay, phần còn lại chạy.
