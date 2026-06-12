/* =========================================================================
   AGENTS VERSE — Icon set (geometric line icons)
   All SVG path data preserved verbatim from brand.jsx.
   Pure presentational — no hooks, no client directive needed.
   ========================================================================= */
import type { CSSProperties } from 'react';

export const ICONS: Record<string, string> = {
  overview:  'M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  command:   'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  rooms:     'M3 9h18M9 21V9M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  agents:    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 20c0-3 2.2-5 5-5s5 2 5 5M17 14a2.5 2.5 0 1 0 0-5M19.5 20c0-2.2-1-3.7-2.7-4.4',
  leads:     'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  audits:    'M12 3a9 9 0 1 0 0 18M12 3v9l5.5 3.2M12 3a9 9 0 0 1 8.5 6',
  demos:     'M3 5h18v14H3zM3 9h18M6.5 7h.01M9 7h.01',
  deals:     'M7 11l3 3 7-7M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  activity:  'M3 12h3l3-8 4 16 3-8h5',
  settings:  'M5 8h10M19 8h0M9 16h10M5 16h0M14 5v6M10 13v6',
  search:    'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM20 20l-4-4',
  bell:      'M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7M10.5 20a2 2 0 0 0 3 0',
  sun:       'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon:      'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  chevR:     'M9 6l6 6-6 6',
  chevD:     'M6 9l6 6 6-6',
  arrowR:    'M5 12h14M13 6l6 6-6 6',
  arrowUR:   'M7 17 17 7M8 7h9v9',
  plus:      'M12 5v14M5 12h14',
  check:     'M5 12.5l4.5 4.5L19 7',
  x:         'M6 6l12 12M18 6 6 18',
  filter:    'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  clock:     'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 7v5l3.5 2',
  dollar:    'M12 2v20M16.5 6.5C16.5 4.5 14.4 3.5 12 3.5S7.5 4.7 7.5 7s2 3 4.5 3.5 4.5 1.3 4.5 3.5-2 3.5-4.5 3.5-4.5-1.2-4.5-3.5',
  alert:     'M12 4 2.5 20h19L12 4ZM12 10v4M12 17.5h.01',
  shield:    'M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3ZM9 12l2 2 4-4',
  bolt:      'M13 3 4 14h6l-1 7 9-11h-6l1-7Z',
  play:      'M7 5l11 7-11 7V5Z',
  external:  'M14 5h5v5M19 5l-8 8M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5',
  pause:     'M8 5v14M16 5v14',
  layers:    'M12 3 2 8.5 12 14l10-5.5L12 3ZM4.5 12 12 16l7.5-4M4.5 16 12 20l7.5-4',
  send:      'M21 3 3 10.5l7 2.5M21 3l-7 18-3.5-7.5M21 3 10.5 13',
  spark:     'M12 3v4M12 17v4M5 12H1M23 12h-4M6 6l2.5 2.5M18 18l-2.5-2.5M6 18l2.5-2.5M18 6l-2.5 2.5',
  user:      'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.5-6 8-6s8 2 8 6',
  pin:       'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  globe:     'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z',
  grid:      'M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z',
  doc:       'M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM14 3v4h4M8 13h8M8 17h6',
  menu:      'M4 7h16M4 12h16M4 17h16',
  flow:      'M5 6h6a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h3M5 6 8 3M5 6l3 3M19 18l-3-3M19 18l-3 3',
  chat:      'M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z',
  chatdots:  'M8 11h.01M12 11h.01M16 11h.01M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4.5 19.5l1.3-4.2A7.5 7.5 0 1 1 20 11.5Z',
  minus:     'M5 12h14',
};

export interface IconProps {
  name: string;
  size?: number;
  sw?: number;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, sw = 1.6, style, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', ...style }} className={className}>
      <path d={ICONS[name] || ICONS.dot} />
    </svg>
  );
}
