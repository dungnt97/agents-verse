// =========================================================================
// AGENT BRIEFS — a readable, bilingual (EN + VI) statement of what each agent
// is actually instructed to do, plus where its real prompt lives in the code.
// Pure data (no deps) so it is safe to import anywhere. The EN text faithfully
// reflects the agent's real governing instruction; the VI is a reading aid.
// The verbatim runtime prompt for the demo-gen agents is rendered separately
// (see agent-prompt-preview.ts) and shown on the agent detail screen.
// =========================================================================
export interface AgentBrief {
  role: string;
  en: string;
  vi: string;
  /** Where the agent's real prompt/logic lives, so it can be verified in source. */
  source: string;
}

export const AGENT_BRIEFS: Record<string, AgentBrief> = {
  orion: {
    role: 'Lead Hunter',
    en: 'Hunts real businesses with weak or missing websites via Google Places, then qualifies each like a B2B analyst: scores FIT (industry/size/locality) + SIGNAL (how weak the current site is), sets priority on a ladder (no site or score <40 = hot, 40-69 = warm, 70+ = cold), estimates a realistic redesign+care value ($900-$6000), and gives a one-line rationale citing the specific signal.',
    vi: 'Săn doanh nghiệp web kém/chưa có (Google Places) rồi đánh giá như một analyst B2B: chấm FIT (ngành/quy mô/địa phương) + SIGNAL (site hiện tại yếu cỡ nào), xếp ưu tiên theo thang (không site hoặc <40 = nóng, 40-69 = ấm, 70+ = nguội), ước lượng giá redesign+chăm sóc thực tế ($900-$6000), và nêu một dòng lý do dẫn đúng tín hiệu chính.',
    source: 'lib/discovery/orion-qualify.ts → buildOrionPrompt',
  },
  vega: {
    role: 'Website Critic',
    en: "Studies the prospect's CURRENT website from its screenshots to extract the real brand — colours, logo, tone — and benchmarks best-in-class references in the same niche, producing a tight research brief the designers build from. References come from model knowledge (live web search is unreliable through the gateway).",
    vi: 'Nghiên cứu website HIỆN TẠI của khách (từ ảnh chụp) để rút ra thương hiệu thật — màu, logo, tông giọng — và đối chiếu các tham chiếu hàng đầu cùng ngành, tạo một bản brief nghiên cứu súc tích để bộ phận thiết kế dựa vào. Tham chiếu lấy từ kiến thức của model (web search trực tiếp qua gateway không ổn định).',
    source: 'lib/agents/defs/vega-researcher.ts → buildResearchPrompt',
  },
  atlas: {
    role: 'Brand Strategist',
    en: 'Acts as creative director: commits to ONE bold art direction, solves a palette and two distinct fonts for the brand, and writes the concrete build spec (signature element, sections, CTA) the builder follows. Tight and reference-anchored on purpose — a few bold demands rather than a long defensive checklist.',
    vi: 'Đóng vai giám đốc sáng tạo: cam kết MỘT hướng nghệ thuật táo bạo, chọn bảng màu và hai font khác biệt cho thương hiệu, và viết bản spec cụ thể (chi tiết đặc trưng, các section, CTA) để bộ phận build làm theo. Cố tình súc tích và bám tham chiếu — vài yêu cầu mạnh thay vì một danh sách "đừng" dài.',
    source: 'lib/agents/defs/atlas-strategist.ts → buildConceptPrompt / buildDirectorPrompt',
  },
  nova: {
    role: 'UI Designer',
    en: "Builds the complete, production-quality HTML page from Atlas's spec — real depth, a visible signature element, responsive, no AI-slop — then revises it against the review board's fix list and repairs any layout defects.",
    vi: 'Dựng trang HTML hoàn chỉnh, chất lượng production từ spec của Atlas — có chiều sâu thật, một chi tiết đặc trưng nổi bật, responsive, không "AI-slop" — rồi chỉnh lại theo danh sách lỗi của hội đồng review và sửa các lỗi layout.',
    source: 'lib/agents/defs/nova-designer.ts → buildBuildPrompt / buildRevisePrompt',
  },
  iris: {
    role: 'UX Reviewer',
    en: 'A review-board member on the UX lens: judges visual hierarchy, spacing discipline, mobile usability and conversion UX of the rendered demo, and flags concrete blockers (never vague praise).',
    vi: 'Thành viên hội đồng review ở góc nhìn UX: chấm thứ bậc thị giác, kỷ luật khoảng cách, khả dụng trên mobile và UX chuyển đổi của bản demo, nêu rõ các lỗi chặn cụ thể (không khen chung chung).',
    source: "lib/agents/defs/iris-ux.ts → buildPersonaReviewPrompt('uiux')",
  },
  kira: {
    role: 'Visual QA',
    en: 'A review-board member on the art-direction / brand-craft lens: judges whether the demo reads bespoke and premium or templated/AI-generated, hunts the AI tells and the regression to a generic category template, and applies the "would this win the pitch" bar — every note pushes the page bolder and more distinctive, never safer.',
    vi: 'Thành viên hội đồng review ở góc nhìn art-direction / brand-craft: đánh giá bản demo trông bespoke và cao cấp hay bị templated/AI, truy các dấu hiệu AI và việc trượt về template ngành chung chung, và áp chuẩn "liệu có thắng được pitch không" — mọi góp ý đẩy trang táo bạo và khác biệt hơn, không bao giờ an toàn hơn.',
    source: "lib/agents/defs/kira-qa.ts → buildPersonaReviewPrompt('art')",
  },
  cipher: {
    role: 'Delivery / Technical SEO',
    en: 'After a deal is won, prepares the redesigned homepage to go live by writing production search + social metadata: an SEO title, meta description, Open-Graph title/description and a focused keyword set — tuned to how real local customers search and to render cleanly as a share card. Structured JSON only (no re-rendered page), so it sidesteps the large-HTML reliability ceiling.',
    vi: 'Sau khi chốt deal, chuẩn bị trang chủ redesign để go-live bằng cách viết metadata search + social cho production: SEO title, meta description, Open-Graph title/description và bộ từ khoá tập trung — tinh chỉnh theo cách khách địa phương thật sự tìm kiếm và để hiển thị đẹp như thẻ share. Chỉ trả JSON có cấu trúc (không render lại trang), nên tránh được trần độ tin cậy của HTML lớn.',
    source: 'lib/agents/defs/cipher-coder.ts → buildCipherPrompt',
  },
  echo: {
    role: 'Outreach',
    en: 'Writes a short Vietnamese cold-outreach email offering the free redesign demo. Opens with one specific, verifiable observation about THIS business (signal-first), picks the angle (lead-with-pain PAS or before→after BAB), keeps it warm and human — under 100 words, exactly one soft CTA, no hype/clichés. The system appends the demo link; sending is approval-gated.',
    vi: 'Viết email tiếp cận lạnh (tiếng Việt) mời xem bản demo redesign miễn phí. Mở đầu bằng MỘT quan sát cụ thể, kiểm chứng được về chính doanh nghiệp đó (signal-first), chọn góc (nêu nỗi đau PAS hoặc trước→sau BAB), giữ giọng ấm và người thật — dưới 100 từ, đúng một CTA nhẹ, không sáo rỗng. Hệ thống tự gắn link demo; gửi phải qua duyệt.',
    source: 'lib/agents/defs/echo-outreach.ts → buildEchoPrompt',
  },
  closer: {
    role: 'Sales Closer',
    en: 'Interprets a client\'s reply (treated strictly as untrusted data, injection-guarded). Works in two steps: classify the intent, then choose the next move on a ranked ladder — ready-to-buy → advance (conf 80+); price question → quote; objection/stall/ambiguous → conf below 70 so a human reviews; not interested → lost. Drafts an acknowledge-then-reframe Vietnamese reply grounded only in approved facts (never invents a price or commitment).',
    vi: 'Hiểu phản hồi của khách (coi là dữ liệu không tin cậy, chặn prompt-injection). Làm hai bước: phân loại ý định, rồi chọn bước tiếp theo theo thang ưu tiên — sẵn sàng mua → đẩy tới (conf 80+); hỏi giá → báo giá; phản đối/chần chừ/mơ hồ → conf dưới 70 để người duyệt; không quan tâm → mất. Soạn câu trả lời \'ghi nhận rồi tái định khung\' chỉ dựa trên dữ kiện đã duyệt (không bịa giá/cam kết).',
    source: 'lib/agents/defs/closer-sales.ts → buildCloserPrompt',
  },
  mira: {
    role: 'Client Onboarding',
    en: 'After a deal is won, writes a short warm Vietnamese onboarding email: thanks the client, sets a confident tone, and asks — as a scannable checklist — for the assets needed to start production (logo, brand colours, photos, copy, hours, domain). Human prose, no AI tells, answers only from known facts (never invents a price, date, name, or portal).',
    vi: 'Sau khi chốt deal, viết email onboarding ngắn, ấm (tiếng Việt): cảm ơn khách, tạo giọng tự tin, và xin — dưới dạng checklist dễ đọc — các tài sản cần để bắt đầu sản xuất (logo, màu thương hiệu, ảnh, nội dung, giờ mở cửa, domain). Văn người thật, không \'mùi AI\', chỉ trả lời từ dữ kiện đã biết (không bịa giá, ngày, tên, hay portal).',
    source: 'lib/agents/defs/mira-support.ts → buildMiraPrompt',
  },
  ledger: {
    role: 'Finance',
    en: 'NOT an LLM agent by design — a deterministic cost-meter that estimates daily AI spend and escalates as it nears the budget cap. Finance is kept rule-based on purpose so no model can invent figures.',
    vi: 'CỐ Ý không phải agent LLM — một bộ đo chi phí deterministic, ước tính chi tiêu AI mỗi ngày và cảnh báo khi gần chạm trần ngân sách. Tài chính giữ dạng luật cố định để không model nào bịa được con số.',
    source: 'lib/inngest/functions/orchestrate-pipeline.ts (cost-meter) — no LLM prompt',
  },
};
