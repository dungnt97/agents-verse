/* =========================================================================
   Agents Verse — i18n key module: Settings / Activity / Requests chrome.
   Namespaces: set.* / act.* / req.*
   Consumed by AV_DICT in dictionary.ts via spread or direct merge.
   EN strings are byte-identical to the hardcoded originals.
   ========================================================================= */

export const en = {
  /* ── Settings: section nav labels ─────────────────────────────────────── */
  'set.sectionBrand':      'Brand',
  'set.sectionAutonomy':   'Autonomy',
  'set.sectionPricing':    'Pricing rules',
  'set.sectionOutreach':   'Outreach rules',
  'set.sectionEscalation': 'Escalation rules',
  'set.sectionCost':       'AI cost limits',
  'set.sectionAgents':     'Agent limits',

  /* ── Settings: guardrails sidebar widget ──────────────────────────────── */
  'set.guardrailsActive': 'Guardrails active',
  'set.guardrailsDesc':   'All external actions pass through these rules before they run.',

  /* ── Settings: Brand panel ─────────────────────────────────────────────── */
  'set.brandTitle':       'Brand',
  'set.brandDesc':        'How the company shows up in demos and outreach.',
  'set.companyName':      'Company name',
  'set.logo':             'Logo',
  'set.logoDesc':         'Used on demos, emails and the dashboard.',
  'set.logoReplace':      'Replace',
  'set.primaryColor':     'Primary color',
  'set.typography':       'Typography',
  'set.toneOfVoice':      'Tone of voice',
  'set.toneDesc':         'Default voice for AI-written copy.',

  /* ── Settings: typography & tone segment options ──────────────────────── */
  'set.typHumanist':   'Humanist',
  'set.typGrotesque':  'Grotesque',
  'set.typGeometric':  'Geometric',
  'set.toneFriendly':  'Friendly',
  'set.tonePremium':   'Premium',
  'set.toneDirect':    'Direct',

  /* ── Settings: Autonomy panel ──────────────────────────────────────────── */
  'set.autonomyTitle': 'Autonomy mode',
  'set.autonomyDesc':  'How much the AI can do before it needs you.',

  /* ── Settings: Pricing panel ───────────────────────────────────────────── */
  'set.packagePricingTitle': 'Package pricing',
  'set.packagePricingDesc':  'Prices the AI can quote. Custom builds are always quoted by a human.',
  'set.landingPage':         'Landing Page',
  'set.landingPageDesc':     'Single high-conversion page.',
  'set.businessWebsite':     'Business Website',
  'set.businessWebsiteDesc': 'Up to 6 pages, full system.',
  'set.monthlyGrowthCare':   'Monthly Growth Care',
  'set.monthlyGrowthDesc':   'Per month, recurring.',
  'set.perMonth':            '/mo',

  /* ── Settings: Quote rules panel ──────────────────────────────────────── */
  'set.quoteRulesTitle':    'Quote rules',
  'set.autoQuote':          'Auto-quote below threshold',
  'set.autoQuoteDesc':      'AI can send a quote without you under the limit.',
  'set.founderApproval':    'Founder approval above',
  'set.founderApprovalDesc':'Quotes over this value always need you.',
  'set.customEscalate':     'Custom builds always escalate',
  'set.customEscalateDesc': 'Any custom app / integration request routes to a human.',

  /* ── Settings: Outreach rules panel ───────────────────────────────────── */
  'set.outreachTitle':     'Outreach rules',
  'set.outreachDesc':      'Keeps outreach controlled and respectful — never a spam machine.',
  'set.maxOutreachPerDay': 'Max outreach per day',
  'set.maxOutreachDesc':   'A hard daily cap across all channels.',
  'set.followUpDelay':     'Follow-up delay',
  'set.followUpDesc':      'Days to wait before a single follow-up.',
  'set.followUpUnit':      ' days',
  'set.stopIfNo':          'Stop if client says no',
  'set.stopIfNoDesc':      'All follow-up stops the moment a client declines.',
  'set.neverOverpromise':  'Never overpromise results',
  'set.neverOverpromiseDesc': 'Agents won\'t guarantee revenue, rankings or outcomes.',
  'set.includeUnsub':      'Include unsubscribe / stop option',
  'set.includeUnsubDesc':  'Every message gives an easy way out.',

  /* ── Settings: Escalation rules panel ─────────────────────────────────── */
  'set.escalationTitle':       'Escalation rules',
  'set.escalationDesc':        'When the AI must stop and bring in a human.',
  'set.escClientCall':         'Client asks for a call',
  'set.escLegalPayment':       'Legal, payment or domain question',
  'set.escCustomSystem':       'Custom system / app request',
  'set.escComplaint':          'Client complaint or negative reply',
  'set.escConfThresh':         'AI confidence below',
  'set.escConfThreshDesc':     'Low-confidence work is held for review.',
  'set.escDiscountAbove':      'Discount request above',
  'set.escDiscountAboveDesc':  'Large discount asks need your sign-off.',

  /* ── Settings: AI cost limits panel ───────────────────────────────────── */
  'set.costTitle':          'AI cost limits',
  'set.costDesc':           'Budgets and alerts so spend never runs away.',
  'set.todaySpend':         'Today\'s spend',
  'set.dailyBudget':        'Daily budget',
  'set.monthlyBudget':      'Monthly budget',
  'set.costPerDemo':        'Cost per demo limit',
  'set.costPerOutreach':    'Cost per outreach limit',
  'set.costPerRun':         'Cost per pipeline run',
  'set.costPerRunDesc':     'Blended per-run estimate the Ledger uses for the daily AI-spend gauge.',
  'set.alertThreshold':     'Alert threshold',
  'set.alertThresholdDesc': 'Warn you when spend reaches this share of budget.',

  /* ── Settings: Agent limits panel ─────────────────────────────────────── */
  'set.agentsTitle': 'Agent limits',
  'set.agentsDesc':  'Enable, throttle and gate each agent individually.',
  'set.colAgent':    'Agent',
  'set.colMaxDay':   'Max / day',
  'set.colReview':   'Review',
  'set.colActive':   'Active',

  /* ── Activity: header + export ─────────────────────────────────────────── */
  'act.exportLog':          'Export log',
  'act.searchPlaceholder':  'Search activity…',

  /* ── Activity: filter chip labels ─────────────────────────────────────── */
  'act.filterAll':         'All',
  'act.filterLeads':       'Leads',
  'act.filterDemos':       'Demos',
  'act.filterOutreach':    'Outreach',
  'act.filterReplies':     'Replies',
  'act.filterDeals':       'Deals',
  'act.filterEscalations': 'Escalations',
  'act.filterCost':        'Cost',
  'act.filterProduction':  'Production',

  /* ── Activity: timeline section label ─────────────────────────────────── */
  'act.today': 'Today',

  /* ── Activity: empty state ─────────────────────────────────────────────── */
  'act.noActivity':     'No activity',
  'act.noActivityDesc': 'Nothing matches this filter yet. Events stream in as your agents work.',

  /* ── Activity: type badge labels ───────────────────────────────────────── */
  'act.typeLead':       'Lead',
  'act.typeAudit':      'Audit',
  'act.typeDemo':       'Demo',
  'act.typeOutreach':   'Outreach',
  'act.typeReply':      'Reply',
  'act.typeDeal':       'Deal',
  'act.typeEscalation': 'Escalation',
  'act.typeCost':       'Cost',
  'act.typeProduction': 'Production',

  /* ── Requests: stats band labels ───────────────────────────────────────── */
  'req.totalRequests':  'Total requests',
  'req.statNew':        'New',
  'req.statReviewing':  'Reviewing',
  'req.statContacted':  'Contacted',
  'req.statConverted':  'Converted',
  'req.statConversion': 'Conversion',

  /* ── Requests: filter chip labels ─────────────────────────────────────── */
  'req.filterAll':       'All',
  'req.filterNew':       'New',
  'req.filterReviewing': 'Reviewing',
  'req.filterContacted': 'Contacted',
  'req.filterConverted': 'Converted',

  /* ── Requests: search + empty state ───────────────────────────────────── */
  'req.searchPlaceholder': 'Search requests…',
  'req.noRequests':        'No requests here',
  'req.noRequestsDesc':    'When a business requests a demo from your landing page, it lands here for review.',

  /* ── Requests: card chrome ─────────────────────────────────────────────── */
  'req.noSiteYet':       'No site yet',
  'req.runAuditConvert': 'Run audit & convert',
  'req.reply':           'Reply',
  'req.decline':         'Decline',

  /* ── Requests: status labels ───────────────────────────────────────────── */
  'req.statusNew':       'New',
  'req.statusReviewing': 'Reviewing',
  'req.statusContacted': 'Contacted',
  'req.statusConverted': 'Converted',
  'req.statusDeclined':  'Declined',
} as const;

export const vi: Record<keyof typeof en, string> = {
  /* ── Settings: section nav labels ─────────────────────────────────────── */
  'set.sectionBrand':      'Thương hiệu',
  'set.sectionAutonomy':   'Tự chủ',
  'set.sectionPricing':    'Quy tắc giá',
  'set.sectionOutreach':   'Quy tắc tiếp cận',
  'set.sectionEscalation': 'Quy tắc chuyển xử lý',
  'set.sectionCost':       'Giới hạn chi phí AI',
  'set.sectionAgents':     'Giới hạn agent',

  /* ── Settings: guardrails sidebar widget ──────────────────────────────── */
  'set.guardrailsActive': 'Rào chắn đang bật',
  'set.guardrailsDesc':   'Mọi hành động ra bên ngoài đều qua các quy tắc này trước khi thực thi.',

  /* ── Settings: Brand panel ─────────────────────────────────────────────── */
  'set.brandTitle':    'Thương hiệu',
  'set.brandDesc':     'Cách công ty xuất hiện trong demo và tiếp cận.',
  'set.companyName':   'Tên công ty',
  'set.logo':          'Logo',
  'set.logoDesc':      'Hiển thị trên demo, email và dashboard.',
  'set.logoReplace':   'Thay thế',
  'set.primaryColor':  'Màu chủ đạo',
  'set.typography':    'Typography',
  'set.toneOfVoice':   'Giọng điệu',
  'set.toneDesc':      'Giọng mặc định cho nội dung AI viết.',

  /* ── Settings: typography & tone segment options ──────────────────────── */
  'set.typHumanist':   'Humanist',
  'set.typGrotesque':  'Grotesque',
  'set.typGeometric':  'Geometric',
  'set.toneFriendly':  'Thân thiện',
  'set.tonePremium':   'Cao cấp',
  'set.toneDirect':    'Thẳng thắn',

  /* ── Settings: Autonomy panel ──────────────────────────────────────────── */
  'set.autonomyTitle': 'Chế độ tự chủ',
  'set.autonomyDesc':  'AI có thể làm bao nhiêu trước khi cần bạn.',

  /* ── Settings: Pricing panel ───────────────────────────────────────────── */
  'set.packagePricingTitle': 'Giá gói dịch vụ',
  'set.packagePricingDesc':  'Giá AI có thể báo. Build tuỳ chỉnh luôn do con người báo giá.',
  'set.landingPage':         'Trang Landing',
  'set.landingPageDesc':     'Một trang chuyển đổi cao.',
  'set.businessWebsite':     'Website Doanh nghiệp',
  'set.businessWebsiteDesc': 'Tối đa 6 trang, hệ thống đầy đủ.',
  'set.monthlyGrowthCare':   'Chăm sóc & Phát triển hằng tháng',
  'set.monthlyGrowthDesc':   'Mỗi tháng, định kỳ.',
  'set.perMonth':            '/tháng',

  /* ── Settings: Quote rules panel ──────────────────────────────────────── */
  'set.quoteRulesTitle':    'Quy tắc báo giá',
  'set.autoQuote':          'Tự động báo giá dưới ngưỡng',
  'set.autoQuoteDesc':      'AI có thể gửi báo giá mà không cần bạn khi dưới giới hạn.',
  'set.founderApproval':    'Founder duyệt khi vượt',
  'set.founderApprovalDesc':'Báo giá vượt mức này luôn cần bạn xác nhận.',
  'set.customEscalate':     'Build tuỳ chỉnh luôn chuyển xử lý',
  'set.customEscalateDesc': 'Mọi yêu cầu app / tích hợp tuỳ chỉnh chuyển cho con người.',

  /* ── Settings: Outreach rules panel ───────────────────────────────────── */
  'set.outreachTitle':        'Quy tắc tiếp cận',
  'set.outreachDesc':         'Giữ việc tiếp cận có kiểm soát và tôn trọng — không bao giờ là máy spam.',
  'set.maxOutreachPerDay':    'Số tiếp cận tối đa mỗi ngày',
  'set.maxOutreachDesc':      'Giới hạn cứng hằng ngày trên tất cả kênh.',
  'set.followUpDelay':        'Thời gian chờ follow-up',
  'set.followUpDesc':         'Số ngày chờ trước một lần follow-up duy nhất.',
  'set.followUpUnit':         ' ngày',
  'set.stopIfNo':             'Dừng nếu khách từ chối',
  'set.stopIfNoDesc':         'Mọi follow-up dừng ngay khi khách từ chối.',
  'set.neverOverpromise':     'Không hứa hẹn quá mức',
  'set.neverOverpromiseDesc': 'Agent không cam kết doanh thu, thứ hạng hay kết quả.',
  'set.includeUnsub':         'Thêm tuỳ chọn huỷ đăng ký / dừng',
  'set.includeUnsubDesc':     'Mỗi tin nhắn đều có cách thoát dễ dàng.',

  /* ── Settings: Escalation rules panel ─────────────────────────────────── */
  'set.escalationTitle':       'Quy tắc chuyển xử lý',
  'set.escalationDesc':        'Khi AI phải dừng và nhờ con người can thiệp.',
  'set.escClientCall':         'Khách yêu cầu gọi điện',
  'set.escLegalPayment':       'Câu hỏi pháp lý, thanh toán hoặc tên miền',
  'set.escCustomSystem':       'Yêu cầu hệ thống / app tuỳ chỉnh',
  'set.escComplaint':          'Khiếu nại hoặc phản hồi tiêu cực',
  'set.escConfThresh':         'Độ tự tin AI dưới',
  'set.escConfThreshDesc':     'Công việc độ tự tin thấp được giữ lại để duyệt.',
  'set.escDiscountAbove':      'Yêu cầu giảm giá trên',
  'set.escDiscountAboveDesc':  'Yêu cầu giảm giá lớn cần bạn xác nhận.',

  /* ── Settings: AI cost limits panel ───────────────────────────────────── */
  'set.costTitle':          'Giới hạn chi phí AI',
  'set.costDesc':           'Ngân sách và cảnh báo để chi tiêu không vượt kiểm soát.',
  'set.todaySpend':         'Chi tiêu hôm nay',
  'set.dailyBudget':        'Ngân sách ngày',
  'set.monthlyBudget':      'Ngân sách tháng',
  'set.costPerDemo':        'Giới hạn chi phí mỗi demo',
  'set.costPerOutreach':    'Giới hạn chi phí mỗi lần tiếp cận',
  'set.costPerRun':         'Chi phí mỗi lượt pipeline',
  'set.costPerRunDesc':     'Ước tính chi phí gộp mỗi lượt mà Ledger dùng cho đồng hồ chi tiêu AI hằng ngày.',
  'set.alertThreshold':     'Ngưỡng cảnh báo',
  'set.alertThresholdDesc': 'Cảnh báo khi chi tiêu đạt tỉ lệ này của ngân sách.',

  /* ── Settings: Agent limits panel ─────────────────────────────────────── */
  'set.agentsTitle': 'Giới hạn agent',
  'set.agentsDesc':  'Bật, giảm tốc và kiểm soát từng agent riêng lẻ.',
  'set.colAgent':    'Agent',
  'set.colMaxDay':   'Tối đa / ngày',
  'set.colReview':   'Duyệt',
  'set.colActive':   'Hoạt động',

  /* ── Activity: header + export ─────────────────────────────────────────── */
  'act.exportLog':         'Xuất nhật ký',
  'act.searchPlaceholder': 'Tìm kiếm hoạt động…',

  /* ── Activity: filter chip labels ─────────────────────────────────────── */
  'act.filterAll':         'Tất cả',
  'act.filterLeads':       'Lead',
  'act.filterDemos':       'Demo',
  'act.filterOutreach':    'Tiếp cận',
  'act.filterReplies':     'Phản hồi',
  'act.filterDeals':       'Deal',
  'act.filterEscalations': 'Việc cần xử lý',
  'act.filterCost':        'Chi phí',
  'act.filterProduction':  'Sản xuất',

  /* ── Activity: timeline section label ─────────────────────────────────── */
  'act.today': 'Hôm nay',

  /* ── Activity: empty state ─────────────────────────────────────────────── */
  'act.noActivity':     'Không có hoạt động',
  'act.noActivityDesc': 'Chưa có gì khớp bộ lọc này. Sự kiện sẽ xuất hiện khi agent làm việc.',

  /* ── Activity: type badge labels ───────────────────────────────────────── */
  'act.typeLead':       'Lead',
  'act.typeAudit':      'Audit',
  'act.typeDemo':       'Demo',
  'act.typeOutreach':   'Tiếp cận',
  'act.typeReply':      'Phản hồi',
  'act.typeDeal':       'Deal',
  'act.typeEscalation': 'Việc cần xử lý',
  'act.typeCost':       'Chi phí',
  'act.typeProduction': 'Sản xuất',

  /* ── Requests: stats band labels ───────────────────────────────────────── */
  'req.totalRequests':  'Tổng yêu cầu',
  'req.statNew':        'Mới',
  'req.statReviewing':  'Đang xem',
  'req.statContacted':  'Đã liên hệ',
  'req.statConverted':  'Đã chuyển',
  'req.statConversion': 'Tỉ lệ chuyển',

  /* ── Requests: filter chip labels ─────────────────────────────────────── */
  'req.filterAll':       'Tất cả',
  'req.filterNew':       'Mới',
  'req.filterReviewing': 'Đang xem',
  'req.filterContacted': 'Đã liên hệ',
  'req.filterConverted': 'Đã chuyển',

  /* ── Requests: search + empty state ───────────────────────────────────── */
  'req.searchPlaceholder': 'Tìm kiếm yêu cầu…',
  'req.noRequests':        'Không có yêu cầu nào',
  'req.noRequestsDesc':    'Khi doanh nghiệp yêu cầu demo từ trang landing, yêu cầu sẽ xuất hiện ở đây để duyệt.',

  /* ── Requests: card chrome ─────────────────────────────────────────────── */
  'req.noSiteYet':       'Chưa có website',
  'req.runAuditConvert': 'Chạy audit & chuyển',
  'req.reply':           'Phản hồi',
  'req.decline':         'Từ chối',

  /* ── Requests: status labels ───────────────────────────────────────────── */
  'req.statusNew':       'Mới',
  'req.statusReviewing': 'Đang xem',
  'req.statusContacted': 'Đã liên hệ',
  'req.statusConverted': 'Đã chuyển',
  'req.statusDeclined':  'Đã từ chối',
};
