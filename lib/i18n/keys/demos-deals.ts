// i18n keys for Demos and Deals screens.
// Import into dictionary.ts via spread: { ...demosDealsen } / { ...demosDealvi }.
// Typographic characters (apostrophes, ellipses) are preserved verbatim.

export const en: Record<string, string> = {
  // --- OverviewBand metric labels (demos screen) ---
  'demos.mTotal':    'Total demos',
  'demos.mReview':   'Need review',
  'demos.mSent':     'Sent',
  'demos.mWon':      'Won',
  'demos.mAvgLift':  'Avg lift',
  'demos.mPipeline': 'Pipeline',

  // --- Filter chips (demos screen) ---
  'demos.fAll':          'All',
  'demos.fNeedsReview':  'Needs review',
  'demos.fApproved':     'Approved',
  'demos.fSent':         'Sent',
  'demos.fReplied':      'Client replied',
  'demos.fWon':          'Won',

  // --- Search placeholder ---
  'demos.searchPlaceholder': 'Search business…',

  // --- Empty state ---
  'demos.emptyTitle': 'No demos match',
  'demos.emptySub':   'Try a different status or search term.',

  // --- Drawer: section headings ---
  'demos.sectionBefore':    'Before',
  'demos.sectionAfter':     'After',
  'demos.sectionKeyChanges': 'Key redesign changes',
  'demos.sectionChecklist':  'Quality checklist',
  'demos.sectionOutreach':   'Outreach message',

  // --- Drawer: outreach tone chips ---
  'demos.toneFriendly':    'Friendly',
  'demos.tonePremium':     'Premium',
  'demos.toneDirect':      'Direct',
  'demos.toneLocal':       'Local',

  // --- Drawer: outreach subject prefix ---
  'demos.subjectLabel': 'Subject: ',

  // --- Drawer: open demo button (inside lift banner) ---
  'demos.btnOpenDemo': 'Open demo',

  // --- Drawer: lift banner suffix ---
  'demos.liftSuffix': 'point lift in conversion potential',

  // --- Drawer: guardrail label ---
  'demos.guardrail': 'Within outreach guardrails',

  // --- Drawer: footer action buttons ---
  'demos.btnApprove':         'Approve demo',
  'demos.btnPrepareOutreach': 'Prepare outreach',
  'demos.btnHandleReply':     'Handle reply',
  'demos.btnStartProduction': 'Start production',
  'demos.btnSendReview':      'Send for review',
  'demos.btnImproveAI':       'Improve with AI',
  'demos.btnCopyLink':        'Copy link',

  // --- OverviewBand metric labels (deals screen) ---
  'deals.mOpen':        'Open deals',
  'deals.mApproval':    'Need your approval',
  'deals.mWeighted':    'Weighted value',
  'deals.mWonWeek':     'Won this week',
  'deals.mAvgProb':     'Avg win prob.',
  'deals.mProduction':  'In production',

  // --- Filter chips (deals screen) ---
  'deals.fAll':       'All',
  'deals.fNeedsYou':  'Needs you',
  'deals.fPricing':   'Pricing question',
  'deals.fCreated':   'Deal created',
  'deals.fWon':       'Won',

  // --- Search placeholder ---
  'deals.searchPlaceholder': 'Search client…',

  // --- Empty state ---
  'deals.emptyTitle': 'No deals here',
  'deals.emptySub':   'Nothing matches this filter yet. Replies create deals automatically.',

  // --- DealCard: quoted label ---
  'deals.quotedLabel': 'Quoted · est. value',

  // --- DealDrawer: quote summary tile labels ---
  'deals.tilePackage':  'Package',
  'deals.tileQuoted':   'Quoted',
  'deals.tileEstValue': 'Est. value',
  'deals.tileWinProb':  'Win prob.',

  // --- DealDrawer: section headings ---
  'deals.sectionClientReply':   'Client reply',
  'deals.sectionAiNotes':       'AI interpretation',
  'deals.sectionSuggestedResp': 'Suggested response',
  'deals.sectionWhyNeeds':      'Why this needs you',
  'deals.sectionAiRecommends':  'AI recommends: ',
  'deals.sectionProduction':    'Website production',

  // --- ProductionTimeline: eyebrow ---
  'deals.assetsEyebrow': 'Required client assets',

  // --- ProductionTimeline: asset status labels ---
  'deals.assetReceived': 'Received',
  'deals.assetPending':  'Pending',
  'deals.markStageDone': 'Mark stage complete',

  // --- DealDrawer: footer action buttons ---
  'deals.btnScheduleCall':    'Schedule call',
  'deals.btnTakeOver':        'Take over',
  'deals.btnApproveQuote':    'Approve quote',
  'deals.btnReject':          'Reject',
  'deals.btnCloseWon':        'Close won',
  'deals.btnMarkLost':        'Mark lost',
  'deals.btnApproveReply':    'Approve AI reply',
  'deals.btnEditReply':       'Edit reply',
  'deals.btnSendReply':       'Send suggested reply',
  'deals.btnFollowUp':        'Schedule follow-up',
  'deals.btnRequestAssets':   'Request assets',
  'deals.btnMarkDelivered':   'Mark delivered',
  'deals.btnAskSummary':      'Ask summary',
};

export const vi: Record<string, string> = {
  // --- OverviewBand metric labels (demos screen) ---
  'demos.mTotal':    'Tổng demo',
  'demos.mReview':   'Cần duyệt',
  'demos.mSent':     'Đã gửi',
  'demos.mWon':      'Thắng',
  'demos.mAvgLift':  'Tăng TB',
  'demos.mPipeline': 'Pipeline',

  // --- Filter chips (demos screen) ---
  'demos.fAll':         'Tất cả',
  'demos.fNeedsReview': 'Cần duyệt',
  'demos.fApproved':    'Đã duyệt',
  'demos.fSent':        'Đã gửi',
  'demos.fReplied':     'Khách đã phản hồi',
  'demos.fWon':         'Thắng',

  // --- Search placeholder ---
  'demos.searchPlaceholder': 'Tìm doanh nghiệp…',

  // --- Empty state ---
  'demos.emptyTitle': 'Không có demo phù hợp',
  'demos.emptySub':   'Thử trạng thái hoặc từ khóa khác.',

  // --- Drawer: section headings ---
  'demos.sectionBefore':     'Trước',
  'demos.sectionAfter':      'Sau',
  'demos.sectionKeyChanges': 'Thay đổi chính',
  'demos.sectionChecklist':  'Checklist chất lượng',
  'demos.sectionOutreach':   'Mẫu tiếp cận',

  // --- Drawer: outreach tone chips ---
  'demos.toneFriendly': 'Thân thiện',
  'demos.tonePremium':  'Cao cấp',
  'demos.toneDirect':   'Trực tiếp',
  'demos.toneLocal':    'Địa phương',

  // --- Drawer: outreach subject prefix ---
  'demos.subjectLabel': 'Tiêu đề: ',

  // --- Drawer: open demo button (inside lift banner) ---
  'demos.btnOpenDemo': 'Mở demo',

  // --- Drawer: lift banner suffix ---
  'demos.liftSuffix': 'điểm tăng tiềm năng chuyển đổi',

  // --- Drawer: guardrail label ---
  'demos.guardrail': 'Trong giới hạn tiếp cận',

  // --- Drawer: footer action buttons ---
  'demos.btnApprove':         'Duyệt demo',
  'demos.btnPrepareOutreach': 'Chuẩn bị tiếp cận',
  'demos.btnHandleReply':     'Xử lý phản hồi',
  'demos.btnStartProduction': 'Bắt đầu sản xuất',
  'demos.btnSendReview':      'Gửi để duyệt',
  'demos.btnImproveAI':       'Cải thiện với AI',
  'demos.btnCopyLink':        'Sao chép link',

  // --- OverviewBand metric labels (deals screen) ---
  'deals.mOpen':       'Deal đang mở',
  'deals.mApproval':   'Cần bạn duyệt',
  'deals.mWeighted':   'Giá trị trọng số',
  'deals.mWonWeek':    'Thắng tuần này',
  'deals.mAvgProb':    'Xác suất thắng TB',
  'deals.mProduction': 'Đang sản xuất',

  // --- Filter chips (deals screen) ---
  'deals.fAll':      'Tất cả',
  'deals.fNeedsYou': 'Cần bạn',
  'deals.fPricing':  'Câu hỏi giá',
  'deals.fCreated':  'Deal mới tạo',
  'deals.fWon':      'Thắng',

  // --- Search placeholder ---
  'deals.searchPlaceholder': 'Tìm khách hàng…',

  // --- Empty state ---
  'deals.emptyTitle': 'Chưa có deal nào',
  'deals.emptySub':   'Chưa có gì khớp với bộ lọc này. Phản hồi tạo deal tự động.',

  // --- DealCard: quoted label ---
  'deals.quotedLabel': 'Báo giá · giá trị ước tính',

  // --- DealDrawer: quote summary tile labels ---
  'deals.tilePackage':  'Gói',
  'deals.tileQuoted':   'Báo giá',
  'deals.tileEstValue': 'Giá trị ước tính',
  'deals.tileWinProb':  'Xác suất thắng',

  // --- DealDrawer: section headings ---
  'deals.sectionClientReply':   'Phản hồi khách',
  'deals.sectionAiNotes':       'Phân tích AI',
  'deals.sectionSuggestedResp': 'Phản hồi đề xuất',
  'deals.sectionWhyNeeds':      'Tại sao cần bạn',
  'deals.sectionAiRecommends':  'AI khuyến nghị: ',
  'deals.sectionProduction':    'Sản xuất website',

  // --- ProductionTimeline: eyebrow ---
  'deals.assetsEyebrow': 'Tài nguyên cần từ khách',

  // --- ProductionTimeline: asset status labels ---
  'deals.assetReceived': 'Đã nhận',
  'deals.assetPending':  'Chờ nhận',
  'deals.markStageDone': 'Đánh dấu hoàn thành bước',

  // --- DealDrawer: footer action buttons ---
  'deals.btnScheduleCall':    'Đặt lịch gọi',
  'deals.btnTakeOver':        'Tự xử lý',
  'deals.btnApproveQuote':    'Duyệt báo giá',
  'deals.btnReject':          'Từ chối',
  'deals.btnCloseWon':        'Chốt thắng',
  'deals.btnMarkLost':        'Đánh dấu thua',
  'deals.btnApproveReply':    'Duyệt phản hồi AI',
  'deals.btnEditReply':       'Chỉnh phản hồi',
  'deals.btnSendReply':       'Gửi phản hồi đề xuất',
  'deals.btnFollowUp':        'Lên lịch theo dõi',
  'deals.btnRequestAssets':   'Yêu cầu tài nguyên',
  'deals.btnMarkDelivered':   'Đánh dấu đã giao',
  'deals.btnAskSummary':      'Xem tóm tắt',
};
