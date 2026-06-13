/* =========================================================================
   AGENTS VERSE — StatusBadge
   Reads statusMap from the AV singleton; the label is localized via i18n
   (t('status.<id>')), falling back to the raw statusMap label.
   ========================================================================= */
'use client';

import { AV } from '@/lib/data';
import { useI18n } from '@/lib/i18n/i18n-provider';

export interface StatusBadgeProps {
  status: string;
  sm?: boolean;
}

export function StatusBadge({ status, sm }: StatusBadgeProps) {
  const { t } = useI18n();
  const m = AV.statusMap[status] || AV.statusMap.idle;
  const live = status === 'working' || status === 'active';
  const k = 'status.' + status;
  const label = t(k);
  return (
    <span className={'badge ' + m.cls} style={sm ? { height: 21, fontSize: 11.5 } : undefined}>
      {live ? <span className="pulse" style={{ width: 6, height: 6, background: m.dot }} /> : <span className="dot" style={{ background: m.dot }} />}
      {label !== k ? label : m.label}
    </span>
  );
}
