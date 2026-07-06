# Kế hoạch: Outreach đa kênh — WhatsApp + Telegram

Trạng thái: đang thực thi · Nhánh: `feat/outreach-multichannel` · Base: `main`

## Mục tiêu
Thêm 2 kênh gửi tin ngoài email. Sau khi Echo soạn nội dung, chọn kênh qua env `OUTREACH_CHANNEL`. Giữ email mặc định, mọi kênh **degrade gracefully** khi thiếu credential (đúng convention repo). Đóng vòng cả chiều gửi (outbound) lẫn nhận (inbound → Closer).

## Ràng buộc thực tế (quyết định kiến trúc)
- **WhatsApp (Cloud API)**: CHẠM được lead lạnh qua **`lead.phone`** (discovery đã lưu). Tin đầu tiên (cold) BẮT BUỘC dùng **template đã duyệt** của Meta — không free-form. Sau khi khách nhắn lại (cửa sổ 24h) mới được free-form. → cold first-touch = template.
- **Telegram (Bot API)**: KHÔNG DM được người lạ (chỉ nhắn user đã /start bot). → KHÔNG phải kênh outreach lạnh. Dùng cho **notify team** (`TELEGRAM_CHAT_ID`) + **inbound bot** (khách chủ động nhắn).

## Kiến trúc
### Outbound dispatcher (email | whatsapp)
- `lib/integrations/whatsapp.ts` — `sendWhatsAppTemplate(to, template, lang, bodyParams)`, `sendWhatsAppText(to, text)`, `whatsappConfigured()`. Endpoint `graph.facebook.com/v21.0/<PHONE_NUMBER_ID>/messages`, Bearer `WHATSAPP_ACCESS_TOKEN`. Chuẩn hoá số về E.164.
- `lib/integrations/outreach-channel.ts` — `outreachChannel()`, `outreachChannelConfigured()`, recipient theo kênh, `sendOutreach({lead, draft, demoUrl, unsubscribe})` → email(`sendEmail`) | whatsapp(template params `[company, demoUrl]`).
- `run-outreach.ts` — `loadSendable` check recipient theo kênh (email→`lead.email`, whatsapp→`lead.phone`); thay `sendOutreachEmail` = dispatcher. `markSent` giữ nguyên (advance stage + resolve escalation). Escalation preview = mô tả kênh.

### Inbound (→ Closer, mirror inbound email)
- `lib/integrations/whatsapp-inbound.ts` (pure) — verify chữ ký `X-Hub-Signature-256` (HMAC-SHA256 `WHATSAPP_APP_SECRET`, timing-safe) + parse sender phone + text.
- `app/api/whatsapp/route.ts` — GET verify (`hub.challenge` + `WHATSAPP_VERIFY_TOKEN`); POST → verify sig → map phone→lead→deal → emit `reply/received`.
- `lib/integrations/telegram-inbound.ts` (pure) — parse update (message text, chat_id, from).
- `app/api/telegram/route.ts` — verify header `X-Telegram-Bot-Api-Secret-Token` = `TELEGRAM_WEBHOOK_SECRET`; /start,/help + auto-reply; nhận diện lead qua phone nếu user share contact.

### Notify (Telegram, nhẹ)
- `lib/integrations/telegram.ts` — `sendTelegramMessage(chatId, text)`, `telegramConfigured()`, `notifyTelegram(text)` gửi tới `TELEGRAM_CHAT_ID`.

## Test (cẩn thận)
- Unit mock-fetch: whatsapp send (template + text body shape; thiếu cred → degrade; non-ok → error; số chuẩn hoá E.164). telegram send.
- Unit pure: whatsapp-inbound verify sig (đúng/sai/timing) + parse; telegram-inbound parse + secret.
- Dispatcher: chọn kênh theo env; recipient theo kênh; degrade khi thiếu cred.
- Gate: `npm run typecheck` + `npm run test` + build. + review workflow (adversarial) cho phần webhook/sig.
- Live (khi có cred bạn cấp): WA template gửi thật + WA inbound; TG bot.

## Env mới (thêm vào .env.example)
`OUTREACH_CHANNEL=email|whatsapp` · `WHATSAPP_PHONE_NUMBER_ID` `WHATSAPP_ACCESS_TOKEN` `WHATSAPP_TEMPLATE_NAME` `WHATSAPP_TEMPLATE_LANG` `WHATSAPP_VERIFY_TOKEN` `WHATSAPP_APP_SECRET` · `TELEGRAM_BOT_TOKEN` `TELEGRAM_CHAT_ID` `TELEGRAM_WEBHOOK_SECRET`

## Review đối kháng (đã chạy, 18 agents / 4 lens)
7 finding thật, đã fix: E.164 loại số national leading-0 (HIGH); escalation-preview WhatsApp review đúng template thay vì email-draft bị vứt (medium); replay-staleness check inbound WhatsApp theo message timestamp (medium); Telegram secret compare timing-safe + dedup `update_id` (low). 7 finding bị bác (body-size cap, GET verify-token timing, injection — Closer đã fence sẵn, phone substring-match…).

## Câu hỏi mở / follow-up
- **WhatsApp send at-least-once** (chưa fix, đã ghi chú trong code + PR): Cloud API không có idempotency key như Resend → nếu response timeout sau khi Meta đã nhận, Inngest retry có thể gửi lại 1 lần. Chấp nhận cho v1 off-by-default; trước khi chạy volume thật, gate send sau 1 persisted per-lead sent-marker (hoặc lưu wamid).
- Template WhatsApp: bạn tạo + duyệt trong Meta Business (tên + ngôn ngữ + placeholder). Code map params `[company, demoUrl]` = `{{1}},{{2}}`; template khác cấu trúc thì chỉnh mapping.
- Live test: cần WABA cred (phone-number-id + access-token + template đã duyệt + app-secret + verify-token) và Telegram (bot-token + webhook-secret + chat-id) — chạy khi bạn cấp.
