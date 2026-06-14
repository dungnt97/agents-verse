'use client';

// i18n keys for the Leads Pipeline and Audit screens.
// EN values are verbatim from the original hardcoded strings — do NOT change them.
// VI values follow the project glossary and natural professional Vietnamese.
//
// usePipelineAuditT() overlays these local maps on top of the global AV_DICT so
// that dictionary.ts remains untouched while t() still resolves all keys.

import { useI18n } from '@/lib/i18n/i18n-provider';

export const en = {
  // ---- Pipeline: stage column labels ----
  'leads.stageFound':      'Found',
  'leads.stageAudited':    'Audited',
  'leads.stageDemo':       'Demo',
  'leads.stageContacted':  'Contacted',
  'leads.stageReplied':    'Replied',
  'leads.stageWon':        'Won',
  'leads.stageLost':       'Lost',

  // ---- Pipeline: card next-action button labels ----
  'leads.actionRunAudit':        'Run audit',
  'leads.actionGenerateDemo':    'Generate demo',
  'leads.actionPrepareOutreach': 'Prepare outreach',
  'leads.actionMarkReplied':     'Mark replied',
  'leads.actionMarkWon':         'Mark won',
  'leads.actionStartProduction': 'Start production',

  // ---- Pipeline: filter defaults (also used as option values in <select>) ----
  'leads.allIndustries': 'All industries',
  'leads.allAgents':     'All agents',

  // ---- Pipeline: search placeholder ----
  'leads.searchPlaceholder': 'Search company or URL…',

  // ---- Pipeline: stats labels ----
  'leads.openPipeline': 'Open pipeline',
  'leads.activeLeads':  'Active leads',

  // ---- Pipeline: empty column drop zone ----
  'leads.dropHere': 'Drop here',

  // ---- Pipeline: card action links ----
  'leads.cardAudit': 'Audit',
  'leads.cardDemo':  'Demo',

  // ---- Audit: master rail heading + subheading chrome ----
  'audits.screenTitle': 'Audits',
  'audits.sitesScoredSuffix': 'sites scored · sorted by opportunity',

  // ---- Audit: report header badge ----
  'audits.reportBadge': 'Audit report',

  // ---- Audit: header action buttons ----
  'audits.assignToDesign': 'Assign to design',
  'audits.escalate':       'Escalate',
  'audits.viewDemo':       'View demo',
  'audits.generateDemo':   'Generate demo',

  // ---- Audit: overview panel labels ----
  'audits.currentWebsite':      'Current website',
  'audits.redesignOpportunity': 'Redesign opportunity',
  'audits.aiConfidence':        'AI confidence',

  // ---- Audit: score breakdown section ----
  'audits.scoreBreakdown': 'Score breakdown',

  // ---- Audit: problems panel ----
  'audits.problemsDetected': 'Problems detected',

  // ---- Audit: suggested redesign panel ----
  'audits.suggestedRedesign':   'Suggested redesign',
  'audits.visualDirection':     'Visual direction',
  'audits.recommendedSections': 'Recommended sections',
  'audits.ctaStrategy':         'CTA strategy',
  'audits.contentAngle':        'Content angle',

  // ---- Audit: redesign card bottom button ----
  'audits.generate': 'Generate',

  // ---- Audit: run-audit trigger + job status ----
  'audits.runAudit':      'Run real audit',
  'audits.auditing':      'Queuing…',
  'audits.statusQueued':  'Queued',
  'audits.statusRunning': 'Auditing…',
  'audits.statusFailed':  'Audit failed',
} as const;

export type PipelineAuditKey = keyof typeof en;

export const vi: Record<PipelineAuditKey, string> = {
  // ---- Pipeline: stage column labels ----
  'leads.stageFound':      'Đã tìm',
  'leads.stageAudited':    'Đã audit',
  'leads.stageDemo':       'Demo',
  'leads.stageContacted':  'Đã liên hệ',
  'leads.stageReplied':    'Đã phản hồi',
  'leads.stageWon':        'Thắng',
  'leads.stageLost':       'Thua',

  // ---- Pipeline: card next-action button labels ----
  'leads.actionRunAudit':        'Chạy audit',
  'leads.actionGenerateDemo':    'Tạo demo',
  'leads.actionPrepareOutreach': 'Chuẩn bị tiếp cận',
  'leads.actionMarkReplied':     'Đánh dấu đã phản hồi',
  'leads.actionMarkWon':         'Đánh dấu thắng',
  'leads.actionStartProduction': 'Bắt đầu sản xuất',

  // ---- Pipeline: filter defaults ----
  'leads.allIndustries': 'Tất cả ngành',
  'leads.allAgents':     'Tất cả agent',

  // ---- Pipeline: search placeholder ----
  'leads.searchPlaceholder': 'Tìm công ty hoặc URL…',

  // ---- Pipeline: stats labels ----
  'leads.openPipeline': 'Pipeline đang mở',
  'leads.activeLeads':  'Lead đang hoạt động',

  // ---- Pipeline: empty column drop zone ----
  'leads.dropHere': 'Thả vào đây',

  // ---- Pipeline: card action links ----
  'leads.cardAudit': 'Audit',
  'leads.cardDemo':  'Demo',

  // ---- Audit: master rail heading + subheading chrome ----
  'audits.screenTitle': 'Audit',
  'audits.sitesScoredSuffix': 'site đã chấm điểm · sắp xếp theo cơ hội',

  // ---- Audit: report header badge ----
  'audits.reportBadge': 'Báo cáo audit',

  // ---- Audit: header action buttons ----
  'audits.assignToDesign': 'Giao cho Design Studio',
  'audits.escalate':       'Chuyển cấp trên',
  'audits.viewDemo':       'Xem demo trực tiếp',
  'audits.generateDemo':   'Tạo demo',

  // ---- Audit: overview panel labels ----
  'audits.currentWebsite':      'Hiện tại',
  'audits.redesignOpportunity': 'Cơ hội thiết kế lại',
  'audits.aiConfidence':        'Độ tự tin AI',

  // ---- Audit: score breakdown section ----
  'audits.scoreBreakdown': 'Chi tiết điểm',

  // ---- Audit: problems panel ----
  'audits.problemsDetected': 'Vấn đề phát hiện',

  // ---- Audit: suggested redesign panel ----
  'audits.suggestedRedesign':   'Hướng thiết kế lại đề xuất',
  'audits.visualDirection':     'Hướng hình ảnh',
  'audits.recommendedSections': 'Các section đề xuất',
  'audits.ctaStrategy':         'Chiến lược CTA',
  'audits.contentAngle':        'Góc độ nội dung',

  // ---- Audit: redesign card bottom button ----
  'audits.generate': 'Tạo demo',

  // ---- Audit: run-audit trigger + job status ----
  'audits.runAudit':      'Chạy audit thật',
  'audits.auditing':      'Đang xếp hàng…',
  'audits.statusQueued':  'Trong hàng đợi',
  'audits.statusRunning': 'Đang chấm…',
  'audits.statusFailed':  'Audit lỗi',
};

// Local overlay maps for pipeline-audit keys. Keyed by Lang so the hook can
// pick the right map without touching AV_DICT / dictionary.ts.
const LOCAL: Record<'en' | 'vi', Record<PipelineAuditKey, string>> = { en, vi };

/**
 * Drop-in replacement for useI18n().t that first checks the local pipeline-audit
 * overlay (en/vi maps above) before falling back to the global AV_DICT via t().
 * This lets the components use a single `t` call regardless of whether the key
 * lives in dictionary.ts or in this module.
 */
export function usePipelineAuditT() {
  const { lang, t: globalT } = useI18n();

  const t = (key: string): string => {
    // Prefer local overlay for known pipeline-audit keys
    const local = LOCAL[lang as 'en' | 'vi'];
    if (local && key in local) return local[key as PipelineAuditKey];
    // Fall back to global dictionary (covers leads.title, leads.sub, etc.)
    return globalT(key);
  };

  return { t, lang };
}
