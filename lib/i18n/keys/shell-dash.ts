// Translation key module for app-shell (shell.*) and overview/command screens (dash.*).
// EN values are verbatim from the source files; typographic characters preserved.
// VI values follow the established glossary and voice from dictionary.ts.

export const en: Record<string, string> = {
  // ---- AutonomyControl ----
  'shell.autonomy': 'Autonomy',
  'shell.autonomyManualLabel': 'Manual',
  'shell.autonomyManualShort': 'Manual',
  'shell.autonomyManualDesc': 'AI suggests. You approve every action.',
  'shell.autonomyReviewLabel': 'Review before action',
  'shell.autonomyReviewShort': 'Review first',
  'shell.autonomyReviewDesc': 'AI prepares work. You approve anything external.',
  'shell.autonomyGuardedLabel': 'Autonomous + guardrails',
  'shell.autonomyGuardedShort': 'Guardrailed',
  'shell.autonomyGuardedDesc': 'AI completes low-risk work. You approve risk.',
  'shell.autonomyFullLabel': 'Fully autonomous',
  'shell.autonomyFullShort': 'Fully autonomous',
  'shell.autonomyFullDesc': 'AI acts within rules. Escalates critical issues.',

  // ---- ComingSoon ----
  'shell.comingSoonBadge': 'Phase 2 · in design',
  'shell.backToOverview': 'Back to Overview',
  'shell.openCommandCenter': 'Open Command Center',
  'shell.comingSoonFootnote': 'The first three screens — Landing, Floor Overview and Command Center — set the design bar for this page.',

  // ---- CommandPalette ----
  'shell.searchPlaceholder': 'Search pages, agents, leads…',
  'shell.noResults': 'No results for',
  'shell.typePage': 'Page',
  'shell.typeAgent': 'Agent',
  'shell.typeLead': 'Lead',

  // ---- ReviewCenter ----
  'shell.reviewCenter': 'Review center',
  'shell.approve': 'Approve',
  'shell.dismiss': 'Dismiss',
  'shell.open': 'Open',
  'shell.rcEmpty': 'No items awaiting review.',

  // ---- ReviewCenter item titles / tags (chrome labels, not data) ----
  'shell.rcDemoTitle': 'Demo needs approval',
  'shell.rcDemoTag': 'Demo',
  'shell.rcOutreachTitle': 'Outreach needs review',
  'shell.rcOutreachTag': 'Outreach',
  'shell.rcDealTitle': 'Deal above threshold',
  'shell.rcDealTag': 'Deal',
  'shell.rcHumanTitle': 'Client asked for a human',
  'shell.rcHumanTag': 'Human',
  'shell.rcCostTitle': 'Cost limit warning',
  'shell.rcCostTag': 'Cost',

  // ---- Floor Overview — MetricStat meter ----
  'dash.ofLimit': '% of limit',

  // ---- Floor Overview — map legend ----
  'dash.workflow': 'Workflow',

  // ---- RoomPeek ----
  'dash.currentMission': 'Current mission',
  'dash.running': 'Running',
  'dash.doneToday': 'Done today',
  'dash.health': 'Health',
  'dash.agentsInRoom': 'Agents in this room',
  'dash.openRoom': 'Open room',
  'dash.askSummary': 'Ask summary',

  // ---- EscalationMini / EscalationCard shared ----
  'dash.approve': 'Approve',
  'dash.review': 'Review',
  'dash.prioritySuffix': 'priority',

  // ---- EscalationCard expanded actions ----
  'dash.scheduleCall': 'Schedule call',
  'dash.markWon': 'Mark won',
  'dash.raiseBudget': 'Raise budget',
  'dash.takeOver': 'Take over',
  'dash.askAiSummary': 'Ask AI summary',
  'dash.reject': 'Reject',

  // ---- EscalationCard section eyebrows ----
  'dash.whyEscalated': 'Why this escalated',
  'dash.aiRecommendation': 'AI recommendation',

  // ---- EscalationCard kindLabel ----
  'dash.kindHuman': 'Human requested',
  'dash.kindDeal': 'Deal approval',
  'dash.kindCost': 'Cost warning',
  'dash.kindPipeline': 'Pipeline gate',
  'dash.kindSales': 'Client reply',
  'dash.kindOutreach': 'Outreach email',
  'dash.kindSupport': 'Client onboarding',
  'dash.kindEscalation': 'Escalation',

  // ---- Command Center — escalation queue filter chips ----
  'dash.filterAll': 'All',
  'dash.filterHigh': 'High',
  'dash.filterDeals': 'Deals',
  'dash.filterCost': 'Cost',

  // ---- Command Center — today's AI work summary sub-labels ----
  'dash.workScanned': 'Scanned',
  'dash.workDemos': 'Demos',
  'dash.workOutreach': 'Outreach',
  'dash.workReplies': 'Replies',

  // ---- Command Center — recommended actions (titles, descriptions, action labels) ----
  'dash.recCallTitle': 'Call Nova Realty',
  'dash.recCallDesc': 'High-intent $6.4k lead asked for a human.',
  'dash.recCallAct': 'Schedule',
  'dash.recApproveTitle': 'Approve Mekong quote',
  'dash.recApproveDesc': '$5.2k — within margin, qualified buyer.',
  'dash.recApproveAct': 'Approve',
  'dash.recBudgetTitle': 'Extend AI budget',
  'dash.recBudgetDesc': 'Demo queue will stall at current limit.',
  'dash.recBudgetAct': 'Raise',

  // ---- Revenue/cost chart legends ----
  'dash.chartRevenue': 'Revenue',
  'dash.chartAiCost': 'AI cost',
  'dash.chartMargin': '{n}% margin',
  'dash.chartNow': 'Now',

  // ---- System health rows ----
  'dash.healthLeadFinder': 'Lead finder',
  'dash.healthDemoGenerator': 'Demo generator',
  'dash.healthOutreachSystem': 'Outreach system',
  'dash.healthDeployment': 'Deployment',
  'dash.healthCostBudget': 'Cost budget',

  // ---- System health row notes (templates; {n} filled live from metrics) ----
  'dash.healthNoteScanned': '{n} scanned',
  'dash.healthNoteDemos': '{n} today',
  'dash.healthNoteOutreach': '{n} prepared',
  'dash.healthNoteIdle': 'idle',
  'dash.healthNoteOverBudget': '{n}% used',
};

export const vi: Record<string, string> = {
  // ---- AutonomyControl ----
  'shell.autonomy': 'Tự chủ',
  'shell.autonomyManualLabel': 'Thủ công',
  'shell.autonomyManualShort': 'Thủ công',
  'shell.autonomyManualDesc': 'AI gợi ý. Bạn duyệt từng hành động.',
  'shell.autonomyReviewLabel': 'Duyệt trước khi thực hiện',
  'shell.autonomyReviewShort': 'Duyệt trước',
  'shell.autonomyReviewDesc': 'AI chuẩn bị việc. Bạn duyệt mọi thứ ra bên ngoài.',
  'shell.autonomyGuardedLabel': 'Tự chủ + rào chắn',
  'shell.autonomyGuardedShort': 'Có rào chắn',
  'shell.autonomyGuardedDesc': 'AI xử lý việc rủi ro thấp. Bạn duyệt khi có rủi ro.',
  'shell.autonomyFullLabel': 'Tự chủ hoàn toàn',
  'shell.autonomyFullShort': 'Tự chủ hoàn toàn',
  'shell.autonomyFullDesc': 'AI hành động trong phạm vi quy tắc. Chuyển vấn đề quan trọng lên bạn.',

  // ---- ComingSoon ----
  'shell.comingSoonBadge': 'Giai đoạn 2 · đang thiết kế',
  'shell.backToOverview': 'Quay lại Tổng quan',
  'shell.openCommandCenter': 'Mở Trung tâm điều hành',
  'shell.comingSoonFootnote': 'Ba màn hình đầu tiên — Landing, Tổng quan sàn và Trung tâm điều hành — đặt chuẩn thiết kế cho trang này.',

  // ---- CommandPalette ----
  'shell.searchPlaceholder': 'Tìm trang, agent, lead…',
  'shell.noResults': 'Không có kết quả cho',
  'shell.typePage': 'Trang',
  'shell.typeAgent': 'Agent',
  'shell.typeLead': 'Lead',

  // ---- ReviewCenter ----
  'shell.reviewCenter': 'Trung tâm duyệt',
  'shell.approve': 'Duyệt',
  'shell.dismiss': 'Bỏ qua',
  'shell.open': 'Mở',
  'shell.rcEmpty': 'Không có mục nào cần duyệt.',

  // ---- ReviewCenter item titles / tags ----
  'shell.rcDemoTitle': 'Demo cần duyệt',
  'shell.rcDemoTag': 'Demo',
  'shell.rcOutreachTitle': 'Tiếp cận cần xem xét',
  'shell.rcOutreachTag': 'Tiếp cận',
  'shell.rcDealTitle': 'Deal vượt ngưỡng',
  'shell.rcDealTag': 'Deal',
  'shell.rcHumanTitle': 'Khách yêu cầu gặp người thật',
  'shell.rcHumanTag': 'Con người',
  'shell.rcCostTitle': 'Cảnh báo giới hạn chi phí',
  'shell.rcCostTag': 'Chi phí',

  // ---- Floor Overview — MetricStat meter ----
  'dash.ofLimit': '% giới hạn',

  // ---- Floor Overview — map legend ----
  'dash.workflow': 'Quy trình',

  // ---- RoomPeek ----
  'dash.currentMission': 'Nhiệm vụ hiện tại',
  'dash.running': 'Đang chạy',
  'dash.doneToday': 'Hoàn tất hôm nay',
  'dash.health': 'Sức khỏe',
  'dash.agentsInRoom': 'Agent trong phòng này',
  'dash.openRoom': 'Mở phòng',
  'dash.askSummary': 'Hỏi tóm tắt',

  // ---- EscalationMini / EscalationCard shared ----
  'dash.approve': 'Duyệt',
  'dash.review': 'Xem xét',
  'dash.prioritySuffix': 'ưu tiên',

  // ---- EscalationCard expanded actions ----
  'dash.scheduleCall': 'Đặt lịch gọi',
  'dash.markWon': 'Đánh dấu thắng',
  'dash.raiseBudget': 'Tăng ngân sách',
  'dash.takeOver': 'Tiếp quản',
  'dash.askAiSummary': 'Hỏi AI tóm tắt',
  'dash.reject': 'Từ chối',

  // ---- EscalationCard section eyebrows ----
  'dash.whyEscalated': 'Lý do chuyển xử lý',
  'dash.aiRecommendation': 'Đề xuất của AI',

  // ---- EscalationCard kindLabel ----
  'dash.kindHuman': 'Khách yêu cầu người thật',
  'dash.kindDeal': 'Duyệt Deal',
  'dash.kindCost': 'Cảnh báo chi phí',
  'dash.kindPipeline': 'Cổng duyệt pipeline',
  'dash.kindSales': 'Phản hồi khách',
  'dash.kindOutreach': 'Email tiếp cận',
  'dash.kindSupport': 'Onboarding khách',
  'dash.kindEscalation': 'Chuyển xử lý',

  // ---- Command Center — escalation queue filter chips ----
  'dash.filterAll': 'Tất cả',
  'dash.filterHigh': 'Cao',
  'dash.filterDeals': 'Deal',
  'dash.filterCost': 'Chi phí',

  // ---- Command Center — today's AI work summary sub-labels ----
  'dash.workScanned': 'Đã quét',
  'dash.workDemos': 'Demo',
  'dash.workOutreach': 'Tiếp cận',
  'dash.workReplies': 'Phản hồi',

  // ---- Command Center — recommended actions ----
  'dash.recCallTitle': 'Gọi Nova Realty',
  'dash.recCallDesc': 'Lead $6.4k muốn gặp người thật.',
  'dash.recCallAct': 'Đặt lịch',
  'dash.recApproveTitle': 'Duyệt báo giá Mekong',
  'dash.recApproveDesc': '$5.2k — trong biên lợi nhuận, người mua đủ điều kiện.',
  'dash.recApproveAct': 'Duyệt',
  'dash.recBudgetTitle': 'Mở rộng ngân sách AI',
  'dash.recBudgetDesc': 'Hàng đợi demo sẽ dừng ở giới hạn hiện tại.',
  'dash.recBudgetAct': 'Tăng',

  // ---- Revenue/cost chart legends ----
  'dash.chartRevenue': 'Doanh thu',
  'dash.chartAiCost': 'Chi phí AI',
  'dash.chartMargin': 'Biên {n}%',
  'dash.chartNow': 'Hiện tại',

  // ---- System health rows ----
  'dash.healthLeadFinder': 'Tìm Lead',
  'dash.healthDemoGenerator': 'Tạo Demo',
  'dash.healthOutreachSystem': 'Hệ thống tiếp cận',
  'dash.healthDeployment': 'Triển khai',
  'dash.healthCostBudget': 'Ngân sách chi phí',

  // ---- System health row notes (templates; {n} filled live from metrics) ----
  'dash.healthNoteScanned': 'đã quét {n}',
  'dash.healthNoteDemos': '{n} hôm nay',
  'dash.healthNoteOutreach': 'đã chuẩn bị {n}',
  'dash.healthNoteIdle': 'rảnh',
  'dash.healthNoteOverBudget': 'đã dùng {n}%',
};
