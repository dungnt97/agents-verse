// i18n keys for Rooms and Agents screens.
// EN values are byte-identical to the original hardcoded strings.
// VI values follow the project glossary.
//
// Side-effect: merges these keys into AV_DICT so t() resolves them without
// touching dictionary.ts (which is managed separately).
import { AV_DICT } from '@/lib/i18n/dictionary';

export const en: Record<string, string> = {
  // ── Shared filter bar ────────────────────────────────────────────────────
  'rooms.sortLabel':          'Sort',
  'rooms.searchPlaceholder':  'Search rooms…',

  // ── Rooms overview band labels ───────────────────────────────────────────
  'rooms.bandTotal':          'Total rooms',
  'rooms.bandActive':         'Active',
  'rooms.bandNeedReview':     'Need review',
  'rooms.bandAgentsOnline':   'Agents online',
  'rooms.bandTasksRunning':   'Tasks running',
  'rooms.bandDoneToday':      'Done today',

  // ── Rooms filter chips ───────────────────────────────────────────────────
  'rooms.filterAll':          'All',
  'rooms.filterActive':       'Active',
  'rooms.filterNeedsReview':  'Needs review',
  'rooms.filterWarning':      'Warning',
  'rooms.filterIdle':         'Idle',

  // ── Rooms sort options ───────────────────────────────────────────────────
  'rooms.sortNeedsAttention': 'Needs attention',
  'rooms.sortMostActive':     'Most active',
  'rooms.sortHighestOutput':  'Highest output',
  'rooms.sortLowestHealth':   'Lowest health',

  // ── Rooms empty state ────────────────────────────────────────────────────
  'rooms.emptyTitle':         'No rooms match',
  'rooms.emptySubPrefix':     'Nothing for "',
  'rooms.emptySubSuffix':     '". Try a different filter.',

  // ── Room card ────────────────────────────────────────────────────────────
  'rooms.cardMissionLabel':   'Current mission',
  'rooms.cardRunningLabel':   'running',

  // ── Room detail — navigation ─────────────────────────────────────────────
  'rooms.backLink':           'All rooms',

  // ── Room detail — work panel titles ─────────────────────────────────────
  'rooms.workTitleDesign':    'Current projects',
  'rooms.workTitleAudit':     'Audit queue',
  'rooms.workTitleSales':     'Active deals',
  'rooms.workTitleDefault':   'Current work',

  // ── Room detail — project card ───────────────────────────────────────────
  'rooms.projectProgress':    'Progress',
  'rooms.projectLeadConf':    'Lead · confidence',
  'rooms.projectPreview':     'Preview',

  // ── Room detail — DemoPeek drawer ───────────────────────────────────────
  'rooms.demoBefore':         'Before',
  'rooms.demoAfter':          'After · Agents Verse demo',
  'rooms.demoApprove':        'Approve demo',
  'rooms.demoImprove':        'Improve with AI',

  // ── Room detail — empty work panel ──────────────────────────────────────
  'rooms.nothingTitle':       'Nothing in progress',
  'rooms.nothingSub':         'This room has no active work right now. New tasks will appear here automatically.',

  // ── Room detail — right rail sections ───────────────────────────────────
  'rooms.agentsInRoom':       'Agents in room',
  'rooms.roomTimeline':       'Room timeline',

  // ── Room detail — action buttons ─────────────────────────────────────────
  'rooms.btnAskSummary':      'Ask summary',
  'rooms.btnOpenDemos':       'Open demos',
  'rooms.btnPauseRoom':       'Pause room',
  'rooms.btnEscalate':        'Escalate',
  'rooms.btnPrioritize':      'Prioritize',

  // ── Agents overview band labels ──────────────────────────────────────────
  'agents.bandTotal':         'Total agents',
  'agents.bandActiveNow':     'Active now',
  'agents.bandNeedReview':    'Need review',
  'agents.bandAvgConf':       'Avg confidence',
  'agents.bandTasksToday':    'Tasks today',
  'agents.bandAiCost':        'AI cost today',

  // ── Agents filter chips ──────────────────────────────────────────────────
  'agents.filterAll':         'All',
  'agents.filterWorking':     'Working',
  'agents.filterNeedsReview': 'Needs review',
  'agents.filterWaiting':     'Waiting',
  'agents.filterEscalating':  'Escalating',
  'agents.filterIdle':        'Idle',

  // ── Agents sort options ──────────────────────────────────────────────────
  'agents.sortTopQuality':    'Top quality',
  'agents.sortHighestConf':   'Highest confidence',
  'agents.sortMostTasks':     'Most tasks',
  'agents.sortHighestCost':   'Highest cost',

  // ── Agents filter bar ────────────────────────────────────────────────────
  'agents.searchPlaceholder': 'Search agents…',
  'agents.allRoomsOption':    'All rooms',

  // ── Agents empty state ───────────────────────────────────────────────────
  'agents.emptyTitle':        'No agents match',
  'agents.emptySub':          'Try clearing a filter or searching a different name.',

  // ── Agent card inline labels ─────────────────────────────────────────────
  'agents.cardCurrentTask':   'Current task',
  'agents.cardTodaySuffix':   'today',
  'agents.cardTasksLabel':    'Tasks',
  'agents.cardQualityLabel':  'Quality',
  'agents.cardCostLabel':     'Cost',

  // ── Agent detail — navigation ────────────────────────────────────────────
  'agents.backLink':          'All agents',

  // ── Agent detail — section headings ─────────────────────────────────────
  'agents.sectionCurrentTask':   'Current task',
  'agents.sectionSkills':        'Skills',
  'agents.sectionToolsEnabled':  'Tools enabled',
  'agents.sectionRecentOutputs': 'Recent outputs',
  'agents.sectionTaskHistory':   'Task history',
  'agents.sectionPerformance':   'Performance',

  // ── Agent detail — performance card labels ───────────────────────────────
  'agents.perfTasksCompleted': 'Tasks completed',
  'agents.perfAvgQuality':     'Avg quality',
  'agents.perfApprovalRate':   'Approval rate',
  'agents.perfCostToday':      'Cost today',
  'agents.perfEscalatesBelow': 'Escalates below',
  'agents.perfConfidenceSuffix': '% confidence',

  // ── Agent detail — action buttons ────────────────────────────────────────
  'agents.btnImproveOutput': 'Improve output',
  'agents.btnReassign':      'Reassign',
  'agents.btnPause':         'Pause',
  'agents.btnEscalate':      'Escalate',

  // ── FounderChat widget ────────────────────────────────────────────────────
  'agents.founderControlsTitle': 'Founder controls',
  'agents.founderOnline':        'online',
  'agents.chatSend':             'Send',
};

export const vi: Record<string, string> = {
  // ── Shared filter bar ────────────────────────────────────────────────────
  'rooms.sortLabel':          'Sắp xếp',
  'rooms.searchPlaceholder':  'Tìm kiếm phòng…',

  // ── Rooms overview band labels ───────────────────────────────────────────
  'rooms.bandTotal':          'Tổng phòng',
  'rooms.bandActive':         'Đang hoạt động',
  'rooms.bandNeedReview':     'Cần duyệt',
  'rooms.bandAgentsOnline':   'Agent online',
  'rooms.bandTasksRunning':   'Tác vụ đang chạy',
  'rooms.bandDoneToday':      'Hoàn tất hôm nay',

  // ── Rooms filter chips ───────────────────────────────────────────────────
  'rooms.filterAll':          'Tất cả',
  'rooms.filterActive':       'Đang hoạt động',
  'rooms.filterNeedsReview':  'Cần duyệt',
  'rooms.filterWarning':      'Cảnh báo',
  'rooms.filterIdle':         'Rảnh',

  // ── Rooms sort options ───────────────────────────────────────────────────
  'rooms.sortNeedsAttention': 'Cần xử lý trước',
  'rooms.sortMostActive':     'Hoạt động nhiều nhất',
  'rooms.sortHighestOutput':  'Đầu ra cao nhất',
  'rooms.sortLowestHealth':   'Tình trạng thấp nhất',

  // ── Rooms empty state ────────────────────────────────────────────────────
  'rooms.emptyTitle':         'Không tìm thấy phòng',
  'rooms.emptySubPrefix':     'Không có kết quả cho "',
  'rooms.emptySubSuffix':     '". Thử bộ lọc khác.',

  // ── Room card ────────────────────────────────────────────────────────────
  'rooms.cardMissionLabel':   'Nhiệm vụ hiện tại',
  'rooms.cardRunningLabel':   'đang chạy',

  // ── Room detail — navigation ─────────────────────────────────────────────
  'rooms.backLink':           'Tất cả phòng',

  // ── Room detail — work panel titles ─────────────────────────────────────
  'rooms.workTitleDesign':    'Dự án hiện tại',
  'rooms.workTitleAudit':     'Hàng đợi Audit',
  'rooms.workTitleSales':     'Deal đang xử lý',
  'rooms.workTitleDefault':   'Việc đang làm',

  // ── Room detail — project card ───────────────────────────────────────────
  'rooms.projectProgress':    'Tiến độ',
  'rooms.projectLeadConf':    'Lead · độ tin cậy',
  'rooms.projectPreview':     'Xem trước',

  // ── Room detail — DemoPeek drawer ───────────────────────────────────────
  'rooms.demoBefore':         'Trước',
  'rooms.demoAfter':          'Sau · Agents Verse demo',
  'rooms.demoApprove':        'Duyệt demo',
  'rooms.demoImprove':        'Cải thiện bằng AI',

  // ── Room detail — empty work panel ──────────────────────────────────────
  'rooms.nothingTitle':       'Chưa có công việc',
  'rooms.nothingSub':         'Phòng này không có việc đang làm. Tác vụ mới sẽ tự động xuất hiện ở đây.',

  // ── Room detail — right rail sections ───────────────────────────────────
  'rooms.agentsInRoom':       'Agent trong phòng',
  'rooms.roomTimeline':       'Dòng thời gian phòng',

  // ── Room detail — action buttons ─────────────────────────────────────────
  'rooms.btnAskSummary':      'Hỏi tóm tắt',
  'rooms.btnOpenDemos':       'Mở Demo',
  'rooms.btnPauseRoom':       'Tạm dừng phòng',
  'rooms.btnEscalate':        'Báo cáo khẩn',
  'rooms.btnPrioritize':      'Ưu tiên hoá',

  // ── Agents overview band labels ──────────────────────────────────────────
  'agents.bandTotal':         'Tổng agent',
  'agents.bandActiveNow':     'Đang hoạt động',
  'agents.bandNeedReview':    'Cần duyệt',
  'agents.bandAvgConf':       'Độ tin cậy trung bình',
  'agents.bandTasksToday':    'Tác vụ hôm nay',
  'agents.bandAiCost':        'Chi phí AI hôm nay',

  // ── Agents filter chips ──────────────────────────────────────────────────
  'agents.filterAll':         'Tất cả',
  'agents.filterWorking':     'Đang làm việc',
  'agents.filterNeedsReview': 'Cần duyệt',
  'agents.filterWaiting':     'Đang chờ',
  'agents.filterEscalating':  'Đang báo cáo',
  'agents.filterIdle':        'Rảnh',

  // ── Agents sort options ──────────────────────────────────────────────────
  'agents.sortTopQuality':    'Chất lượng cao nhất',
  'agents.sortHighestConf':   'Độ tin cậy cao nhất',
  'agents.sortMostTasks':     'Nhiều tác vụ nhất',
  'agents.sortHighestCost':   'Chi phí cao nhất',

  // ── Agents filter bar ────────────────────────────────────────────────────
  'agents.searchPlaceholder': 'Tìm kiếm agent…',
  'agents.allRoomsOption':    'Tất cả phòng',

  // ── Agents empty state ───────────────────────────────────────────────────
  'agents.emptyTitle':        'Không tìm thấy agent',
  'agents.emptySub':          'Thử xoá bộ lọc hoặc tìm tên khác.',

  // ── Agent card inline labels ─────────────────────────────────────────────
  'agents.cardCurrentTask':   'Việc đang làm',
  'agents.cardTodaySuffix':   'hôm nay',
  'agents.cardTasksLabel':    'Tác vụ',
  'agents.cardQualityLabel':  'Chất lượng',
  'agents.cardCostLabel':     'Chi phí',

  // ── Agent detail — navigation ────────────────────────────────────────────
  'agents.backLink':          'Tất cả agent',

  // ── Agent detail — section headings ─────────────────────────────────────
  'agents.sectionCurrentTask':   'Việc đang làm',
  'agents.sectionSkills':        'Kỹ năng',
  'agents.sectionToolsEnabled':  'Công cụ bật',
  'agents.sectionRecentOutputs': 'Kết quả gần đây',
  'agents.sectionTaskHistory':   'Lịch sử công việc',
  'agents.sectionPerformance':   'Hiệu suất',

  // ── Agent detail — performance card labels ───────────────────────────────
  'agents.perfTasksCompleted': 'Tác vụ hoàn thành',
  'agents.perfAvgQuality':     'Chất lượng trung bình',
  'agents.perfApprovalRate':   'Tỉ lệ duyệt',
  'agents.perfCostToday':      'Chi phí hôm nay',
  'agents.perfEscalatesBelow': 'Báo cáo khi dưới',
  'agents.perfConfidenceSuffix': '% độ tin cậy',

  // ── Agent detail — action buttons ────────────────────────────────────────
  'agents.btnImproveOutput': 'Cải thiện đầu ra',
  'agents.btnReassign':      'Phân lại',
  'agents.btnPause':         'Tạm dừng',
  'agents.btnEscalate':      'Báo cáo khẩn',

  // ── FounderChat widget ────────────────────────────────────────────────────
  'agents.founderControlsTitle': 'Kiểm soát của Founder',
  'agents.founderOnline':        'trực tuyến',
  'agents.chatSend':             'Gửi',
};

// Merge into AV_DICT at module load so t() resolves these keys
// without requiring changes to dictionary.ts.
Object.assign(AV_DICT.en, en);
Object.assign(AV_DICT.vi, vi);
