/* =========================================================================
   UI status labels — localized overlay for AV.statusMap labels.
   Merged into the active dictionary in i18n-provider.tsx; StatusBadge resolves
   t('status.<id>') and falls back to the raw statusMap label.
   ========================================================================= */
export const en: Record<string, string> = {
  'status.active': 'Active',
  'status.working': 'Working',
  'status.idle': 'Idle',
  'status.waiting': 'Waiting',
  'status.warning': 'Warning',
  'status.review': 'Needs review',
  'status.escalate': 'Escalating',
  'status.paused': 'Paused',
  'dealStage.pricing': 'Pricing question',
  'dealStage.created': 'Deal created',
  'dealStage.quoted': 'Quote prepared',
  'dealStage.approval': 'Approval required',
  'dealStage.call': 'Human call requested',
  'dealStage.won': 'Won',
  'dealStage.lost': 'Lost',
};

export const vi: Record<string, string> = {
  'status.active': 'Đang hoạt động',
  'status.working': 'Đang làm',
  'status.idle': 'Rảnh',
  'status.waiting': 'Đang chờ',
  'status.warning': 'Cảnh báo',
  'status.review': 'Cần duyệt',
  'status.escalate': 'Cần xử lý',
  'status.paused': 'Tạm dừng',
  'dealStage.pricing': 'Hỏi về giá',
  'dealStage.created': 'Đã tạo deal',
  'dealStage.quoted': 'Đã chuẩn bị báo giá',
  'dealStage.approval': 'Cần duyệt',
  'dealStage.call': 'Yêu cầu gọi điện',
  'dealStage.won': 'Thắng',
  'dealStage.lost': 'Thua',
};
