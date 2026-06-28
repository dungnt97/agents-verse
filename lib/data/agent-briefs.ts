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
    en: 'Hunts real businesses with weak or missing websites via Google Places, then qualifies each as a redesign prospect — estimating a realistic engagement value, a priority (hot / warm / cold) and a one-line rationale. Lower current-site quality (or no site at all) means bigger upside and a hotter priority.',
    vi: 'Săn doanh nghiệp thật có website kém hoặc chưa có (qua Google Places), rồi đánh giá từng cái như một cơ hội redesign — ước lượng giá trị hợp đồng thực tế, mức ưu tiên (nóng / ấm / nguội) và một dòng lý do. Site hiện tại càng kém (hoặc chưa có) thì tiềm năng càng lớn, ưu tiên càng nóng.',
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
    en: 'A review-board member on the visual-QA lens: catches broken layout, overflow, clipped or overlapping text, broken images and visual inconsistencies in the rendered demo.',
    vi: 'Thành viên hội đồng review ở góc nhìn QA hình ảnh: bắt lỗi layout vỡ, tràn, chữ bị cắt/đè, ảnh hỏng và các điểm thiếu nhất quán trong bản demo.',
    source: "lib/agents/defs/kira-qa.ts → buildPersonaReviewPrompt('qa')",
  },
  cipher: {
    role: 'Frontend Coder',
    en: 'Converts an approved demo into a clean, production frontend build.',
    vi: 'Chuyển bản demo đã duyệt thành một bản build frontend sạch, sẵn sàng production.',
    source: 'lib/agents/defs/cipher-coder.ts',
  },
  echo: {
    role: 'Outreach',
    en: 'Drafts a personalised outreach email to a lead — referencing their audited site and the generated demo, with a clear call to action. Always gated behind founder approval before anything sends.',
    vi: 'Soạn email tiếp cận cá nhân hoá cho từng lead — dẫn chiếu site đã audit và bản demo đã tạo, kèm CTA rõ ràng. Luôn phải qua phê duyệt của founder trước khi gửi.',
    source: 'lib/agents/defs/echo-outreach.ts',
  },
  closer: {
    role: 'Sales Closer',
    en: "Interprets a client's reply, decides the deal's next step — advance, send a quote, or escalate to the founder — and explains the reasoning behind the call.",
    vi: 'Hiểu phản hồi của khách, quyết bước tiếp theo của deal — đẩy tới, gửi báo giá, hay chuyển founder duyệt — và giải thích lý do cho quyết định đó.',
    source: 'lib/agents/defs/closer-sales.ts',
  },
  mira: {
    role: 'Support',
    en: 'Handles client feedback, revision requests and monthly care for live clients.',
    vi: 'Xử lý phản hồi của khách, các yêu cầu chỉnh sửa và chăm sóc hàng tháng cho khách đang chạy.',
    source: 'lib/agents/defs/mira-support.ts',
  },
  ledger: {
    role: 'Finance',
    en: 'NOT an LLM agent by design — a deterministic cost-meter that estimates daily AI spend and escalates as it nears the budget cap. Finance is kept rule-based on purpose so no model can invent figures.',
    vi: 'CỐ Ý không phải agent LLM — một bộ đo chi phí deterministic, ước tính chi tiêu AI mỗi ngày và cảnh báo khi gần chạm trần ngân sách. Tài chính giữ dạng luật cố định để không model nào bịa được con số.',
    source: 'lib/inngest/functions/orchestrate-pipeline.ts (cost-meter) — no LLM prompt',
  },
};
