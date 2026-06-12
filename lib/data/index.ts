/* =========================================================================
   AGENTS VERSE — Data singleton (ES module port of data.js + data2/3/4.js)
   Build-up mirrors the legacy IIFE load order: base → detail → audits → deals.
   Converted from window.AV globals to a typed named export — no window writes.
   ========================================================================= */
import type {
  AVData, Room, Agent, Lead, Metrics, Escalation, ActivityItem, Stage,
  StatusMap, Fmt,
  AgentDetail, RoomProject, TimelineItem,
  Redesign, ScoreProfile, ScoreLabelEntry, Demo, DemoStatusMap, AuditResult,
  ReqStatusMap, Deal, DemoRequest,
} from './types';

/* =========================================================================
   BASE (data.js)
   ========================================================================= */

const rooms: Room[] = [
  { id:'ceo',     name:'CEO Control Room',   short:'Control',  purpose:'Founder oversight, approvals & autonomy control.', status:'review',  agents:['ledger'], active:1, running:3,  done:11, health:96, mission:'3 escalations awaiting your decision', x:50, y:6,  pos:'top' },
  { id:'research',name:'Lead Research Room',  short:'Research', purpose:'Finds businesses with outdated or missing websites.', status:'active', agents:['orion'], active:1, running:6,  done:148,health:99, mission:'Scanning dental & hospitality in 3 cities', x:14, y:31 },
  { id:'audit',   name:'Website Audit Room',  short:'Audit',    purpose:'Scores current sites & finds redesign opportunities.', status:'active', agents:['vega'], active:1, running:4,  done:39, health:94, mission:'Auditing 4 high-potential leads', x:35, y:31 },
  { id:'design',  name:'Design Studio',       short:'Design',   purpose:'Creates website demo concepts & visual systems.', status:'active', agents:['atlas','nova','iris','kira'], active:3, running:4, done:12, health:91, mission:'4 demos in production, 2 awaiting review', x:50, y:57, pos:'hub' },
  { id:'code',    name:'Code Lab',            short:'Code',     purpose:'Converts approved demos into frontend builds.', status:'idle',   agents:['cipher'], active:0, running:1,  done:5,  health:88, mission:'1 build queued · idle capacity', x:65, y:31 },
  { id:'sales',   name:'Sales Room',          short:'Sales',    purpose:'Prepares outreach, handles replies, quotes packages.', status:'review', agents:['echo','closer'], active:2, running:5, done:38, health:90, mission:'7 replies · 2 deals need approval', x:86, y:31 },
  { id:'support', name:'Client Support Room', short:'Support',  purpose:'Handles client feedback, revisions & monthly care.', status:'active', agents:['mira'], active:1, running:2,  done:9,  health:97, mission:'2 active production projects', x:31, y:82 },
  { id:'finance', name:'Finance Room',        short:'Finance',  purpose:'Tracks revenue, AI cost, invoices & margin.', status:'warning',agents:['ledger'], active:1, running:2,  done:6,  health:82, mission:'AI cost approaching daily limit', x:69, y:82 },
];

const agents: Agent[] = [
  { id:'orion',  name:'Orion',  role:'Lead Hunter Agent',     room:'research', status:'working',  conf:96, tasks:148, quality:93, cost:8.40,  task:'Scanning hospitality businesses in Da Nang', hue:212 },
  { id:'vega',   name:'Vega',   role:'Website Critic Agent',  room:'audit',    status:'working',  conf:91, tasks:39,  quality:90, cost:6.10,  task:'Auditing Atlas Dental Clinic homepage', hue:188 },
  { id:'atlas',  name:'Atlas',  role:'Brand Strategist Agent',room:'design',   status:'working',  conf:88, tasks:12,  quality:92, cost:4.20,  task:'Defining visual direction for Nova Realty', hue:152 },
  { id:'nova',   name:'Nova',   role:'UI Designer Agent',     room:'design',   status:'working',  conf:94, tasks:12,  quality:95, cost:5.80,  task:'Creating homepage demo for Lumi Spa Studio', hue:265 },
  { id:'iris',   name:'Iris',   role:'UX Reviewer Agent',     room:'design',   status:'review',   conf:79, tasks:9,   quality:89, cost:3.10,  task:'Reviewing GreenBite mobile layout', hue:28 },
  { id:'kira',   name:'Kira',   role:'Visual QA Agent',       room:'design',   status:'idle',     conf:92, tasks:7,   quality:94, cost:1.90,  task:'Idle · awaiting next demo', hue:330 },
  { id:'cipher', name:'Cipher', role:'Frontend Coder Agent',  room:'code',     status:'waiting',  conf:90, tasks:5,   quality:91, cost:7.40,  task:'Waiting on approved Atlas Dental demo', hue:222 },
  { id:'echo',   name:'Echo',   role:'Outreach Agent',        room:'sales',    status:'working',  conf:87, tasks:38,  quality:88, cost:4.90,  task:'Drafting outreach for 3 new demos', hue:14 },
  { id:'closer', name:'Closer', role:'Sales Closer Agent',    room:'sales',    status:'escalate', conf:74, tasks:11,  quality:86, cost:3.60,  task:'Nova Realty asked to speak with the owner', hue:8 },
  { id:'mira',   name:'Mira',   role:'Support Agent',         room:'support',  status:'working',  conf:95, tasks:9,   quality:96, cost:2.30,  task:'Collecting assets for UrbanFit launch', hue:172 },
  { id:'ledger', name:'Ledger', role:'Finance Agent',         room:'finance',  status:'review',   conf:83, tasks:6,   quality:90, cost:1.10,  task:'AI cost at 84% of daily budget', hue:45 },
];

const leads: Lead[] = [
  { id:'atlas-d', company:'Atlas Dental Clinic', industry:'Healthcare', city:'Houston',          url:'atlasdentalhou.com',     site:34, score:88, value:3200, agent:'nova',   stage:'demo',      demo:'review' },
  { id:'lumi',    company:'Lumi Spa Studio',     industry:'Wellness',   city:'Singapore',        url:'lumispa.sg',             site:41, score:84, value:2800, agent:'nova',   stage:'demo',      demo:'approved' },
  { id:'green',   company:'GreenBite Restaurant',industry:'Hospitality',city:'Brooklyn',         url:'greenbite.nyc',          site:38, score:81, value:2400, agent:'iris',   stage:'contacted', demo:'sent' },
  { id:'nova-r',  company:'Nova Realty Group',   industry:'Real Estate',city:'Miami',            url:'novarealtygrp.com',      site:46, score:90, value:6400, agent:'atlas',  stage:'replied',   demo:'replied' },
  { id:'mekong',  company:'Mekong Logistics',    industry:'Logistics',  city:'Ho Chi Minh City', url:'mekong-log.vn',          site:29, score:76, value:5200, agent:'vega',   stage:'audited',   demo:'draft' },
  { id:'urbanfit',company:'UrbanFit Gym',        industry:'Fitness',    city:'Bangkok',          url:'urbanfitbkk.com',        site:52, score:72, value:2100, agent:'mira',   stage:'won',       demo:'won' },
  { id:'cedar',   company:'Cedar Vet Clinic',    industry:'Healthcare', city:'Da Nang',          url:'cedarvet.vn',            site:44, score:79, value:2600, agent:'vega',   stage:'audited',   demo:'draft' },
  { id:'north',   company:'Northwind Roastery',  industry:'Hospitality',city:'Hanoi',            url:'northwind.coffee',       site:37, score:83, value:1900, agent:'orion',  stage:'found',     demo:'none' },
];

const metrics: Metrics = {
  scanned:148, leads:43, demos:12, outreach:38, replies:7, won:2,
  forecast:8400, cost:42.80, costLimit:50, escalations:3, online:17, inProgress:42, completed:238,
  margin:81, netProfit:6940,
};

const escalations: Escalation[] = [
  { id:'e1', kind:'human', sev:'high',   title:'Client asked to speak with the owner', who:'Nova Realty Group', value:6400, agent:'closer', reason:'Client explicitly requested a human call before committing to a $6.4k deal.', rec:'Schedule a 15-min founder call — high intent, deal above auto-approve threshold.', conf:74, time:'8 min ago' },
  { id:'e2', kind:'deal',  sev:'high',   title:'Deal value above approval threshold', who:'Mekong Logistics',  value:5200, agent:'closer', reason:'Quoted $5,200 for a 6-page business site. Auto-approve limit is $4,000.', rec:'Approve quote — pricing is within margin rules and client is qualified.', conf:88, time:'22 min ago' },
  { id:'e3', kind:'cost',  sev:'medium', title:'AI cost approaching daily limit',     who:'Finance Room',      value:0,    agent:'ledger', reason:'Daily spend at $42.80 of $50.00 (84%). Demo generation queue still active.', rec:'Raise today’s budget by $20 or pause non-critical generation until tomorrow.', conf:83, time:'35 min ago' },
];

const activity: ActivityItem[] = [
  { t:'just now', agent:'orion',  room:'research', type:'lead',     text:'Found Northwind Roastery — outdated single-page site', status:'info' },
  { t:'2m',  agent:'nova',   room:'design',   type:'demo',     text:'Generated homepage demo for Lumi Spa Studio', status:'success' },
  { t:'6m',  agent:'closer', room:'sales',    type:'escalate', text:'Escalated Nova Realty — client requested a human call', status:'warning' },
  { t:'11m', agent:'vega',   room:'audit',    type:'audit',    text:'Scored Atlas Dental Clinic — 34/100, high redesign potential', status:'info' },
  { t:'18m', agent:'echo',   room:'sales',    type:'outreach', text:'Prepared outreach for GreenBite Restaurant — awaiting review', status:'review' },
  { t:'24m', agent:'mira',   room:'support',  type:'production',text:'Requested brand assets from UrbanFit Gym', status:'info' },
  { t:'31m', agent:'ledger', room:'finance',  type:'cost',     text:'AI cost reached 84% of today’s budget', status:'warning' },
  { t:'40m', agent:'nova',   room:'design',   type:'demo',     text:'Demo approved for Lumi Spa Studio — safe to send', status:'success' },
  { t:'52m', agent:'closer', room:'sales',    type:'deal',     text:'Marked UrbanFit Gym as won — $2,100 landing package', status:'success' },
  { t:'6m',  agent:'closer', room:'sales',    type:'reply',    text:'Nova Realty Group replied — wants to speak with the owner', status:'warning' },
  { t:'18m', agent:'closer', room:'sales',    type:'reply',    text:'GreenBite Restaurant replied — asked for pricing', status:'info' },
  { t:'48m', agent:'mira',   room:'support',  type:'reply',    text:'Lumi Spa Studio replied — sharing with their partner', status:'success' },
  { t:'1h',  agent:'cipher', room:'code',     type:'production',text:'Started frontend build for UrbanFit Gym', status:'info' },
  { t:'1h',  agent:'vega',   room:'audit',    type:'audit',    text:'Scored Cedar Vet Clinic — 44/100, redesign worth $2.6k', status:'info' },
  { t:'2h',  agent:'echo',   room:'sales',    type:'outreach', text:'Sent demo preview to GreenBite Restaurant', status:'success' },
  { t:'2h',  agent:'closer', room:'sales',    type:'deal',     text:'Prepared $5,200 quote for Mekong Logistics — needs approval', status:'review' },
  { t:'3h',  agent:'orion',  room:'research', type:'lead',     text:'Found Cedar Vet Clinic — outdated mobile layout', status:'info' },
  { t:'3h',  agent:'iris',   room:'design',   type:'demo',     text:'Approved GreenBite mobile layout after one revision', status:'success' },
  { t:'4h',  agent:'ledger', room:'finance',  type:'cost',     text:'Logged $6.40 demo-generation cost for Lumi Spa Studio', status:'info' },
  { t:'5h',  agent:'mira',   room:'support',  type:'production',text:'UrbanFit Gym moved to content-collection phase', status:'info' },
];

const stages: Stage[] = [
  { id:'found',     label:'Found' },
  { id:'audited',   label:'Audited' },
  { id:'demo',      label:'Demo Generated' },
  { id:'contacted', label:'Contacted' },
  { id:'replied',   label:'Replied' },
  { id:'won',       label:'Deal Won' },
];

const statusMap: StatusMap = {
  active:   { label:'Active',       cls:'badge-success', dot:'var(--success)' },
  working:  { label:'Working',      cls:'badge-success', dot:'var(--success)' },
  idle:     { label:'Idle',         cls:'badge-neutral', dot:'var(--ink-3)' },
  waiting:  { label:'Waiting',      cls:'badge-info',    dot:'var(--info)' },
  warning:  { label:'Warning',      cls:'badge-warning', dot:'var(--warning)' },
  review:   { label:'Needs review', cls:'badge-warning', dot:'var(--warning)' },
  escalate: { label:'Escalating',   cls:'badge-danger',  dot:'var(--danger)' },
  paused:   { label:'Paused',       cls:'badge-neutral', dot:'var(--ink-3)' },
};

const fmt: Fmt = {
  money: (n) => '$' + n.toLocaleString('en-US'),
  money2:(n) => '$' + n.toFixed(2),
  k:     (n) => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : '$' + n,
};

const agentById = (id: string) => agents.find(a => a.id === id);
const roomById  = (id: string) => rooms.find(r => r.id === id);

/* =========================================================================
   DATA2 — Room & agent detail helpers
   ========================================================================= */

const SKILLS: Record<string, string[]> = {
  'Lead Hunter Agent':     ['Business discovery','Web-presence scoring','Market segmentation','Contact enrichment','Lead prioritization'],
  'Website Critic Agent':  ['Heuristic audit','Mobile UX analysis','Performance read','Conversion review','Accessibility scan'],
  'Brand Strategist Agent':['Visual direction','Brand systems','Industry positioning','Color & type','Moodboarding'],
  'UI Designer Agent':     ['Landing-page design','Industry visual direction','Conversion UX','Responsive layout','Design-system generation'],
  'UX Reviewer Agent':     ['Flow analysis','Mobile-first review','Form UX','Heuristic evaluation','Accessibility'],
  'Visual QA Agent':       ['Pixel QA','Cross-device checks','Contrast audit','Spacing consistency','Brand compliance'],
  'Frontend Coder Agent':  ['React build','Responsive code','Performance optimisation','SEO markup','Deploy prep'],
  'Outreach Agent':        ['Personalized copy','Channel selection','Tone matching','Follow-up sequencing','Send-time logic'],
  'Sales Closer Agent':    ['Reply analysis','Objection handling','Quoting','Deal qualification','Negotiation'],
  'Support Agent':         ['Asset collection','Revision handling','Client comms','Care scheduling','QA handoff'],
  'Finance Agent':         ['Cost tracking','Margin analysis','Invoicing','Budget alerts','Forecasting'],
};
const TOOLS: Record<string, string[]> = {
  'Lead Hunter Agent':     ['Web search','Maps API','Company database','Email finder'],
  'Website Critic Agent':  ['Lighthouse','Screenshot capture','HTML parser','Mobile emulator'],
  'Brand Strategist Agent':['Moodboard engine','Color tokens','Type library','Reference search'],
  'UI Designer Agent':     ['Layout engine','Component library','Image generation','Color tokens'],
  'UX Reviewer Agent':     ['Flow mapper','Device emulator','Contrast checker','Heuristics set'],
  'Visual QA Agent':       ['Pixel differ','Device matrix','Contrast checker'],
  'Frontend Coder Agent':  ['Code sandbox','Component library','Build pipeline','Deploy target'],
  'Outreach Agent':        ['Email composer','LinkedIn draft','Send scheduler','Personalization'],
  'Sales Closer Agent':    ['Reply parser','Quote builder','CRM sync','Calendar'],
  'Support Agent':         ['Asset intake','Ticket queue','Client messenger','Scheduler'],
  'Finance Agent':         ['Ledger','Cost meter','Invoice generator','Budget alerts'],
};
const PURPOSE: Record<string, string> = {
  'Lead Hunter Agent':     'Continuously finds local businesses whose web presence is outdated, weak, or missing — and ranks them by redesign potential.',
  // Typographic apostrophe in source preserved (data2.js:34)
  'Website Critic Agent':  'Audits a target site across design, mobile, trust and conversion, producing a score and a prioritized problem list.',
  'Brand Strategist Agent':"Sets the visual direction and brand system each demo should follow, tuned to the client’s industry and audience.",
  'UI Designer Agent':     'Creates high-conversion website demo interfaces from an audit and a brand direction — the working preview a client first sees.',
  'UX Reviewer Agent':     'Reviews demo flows for clarity and mobile usability before they reach a client, flagging friction early.',
  'Visual QA Agent':       'Final visual quality gate — checks pixels, spacing, contrast and brand consistency across devices.',
  'Frontend Coder Agent':  'Turns an approved demo into a production frontend build, responsive and ready to deploy.',
  'Outreach Agent':        'Drafts personalized, on-brand outreach with the demo link, matched to channel and tone — always within guardrails.',
  'Sales Closer Agent':    'Reads client replies, handles objections, prepares quotes, and escalates the decisions that need a human.',
  'Support Agent':         'Collects assets, manages revisions and runs monthly care for live clients.',
  'Finance Agent':         'Tracks revenue, AI cost, invoices and margin — and raises an alert before a budget is breached.',
};

const HISTORY: Record<string, { t: string; event: string; status: string }[]> = {
  'UI Designer Agent': [
    { t:'2m',  event:'Generated homepage demo — Lumi Spa Studio', status:'success' },
    { t:'40m', event:'Demo approved by Visual QA — Lumi Spa Studio', status:'success' },
    { t:'1h',  event:'Revised hero per UX review — GreenBite', status:'info' },
    { t:'2h',  event:'Started homepage demo — Atlas Dental Clinic', status:'info' },
    { t:'3h',  event:'Held for review — confidence below 85%', status:'review' },
  ],
  'Sales Closer Agent': [
    { t:'8m',  event:'Escalated — Nova Realty asked for a human call', status:'warning' },
    { t:'35m', event:'Prepared quote — Mekong Logistics ($5,200)', status:'info' },
    { t:'1h',  event:'Marked won — UrbanFit Gym ($2,100)', status:'success' },
    { t:'2h',  event:'Handled pricing objection — GreenBite', status:'info' },
  ],
};
const DEFAULT_HISTORY = [
  { t:'5m',  event:'Completed current task batch', status:'success' },
  { t:'45m', event:'Picked up new task from queue', status:'info' },
  { t:'1h',  event:'Output passed quality threshold', status:'success' },
  { t:'2h',  event:'Started shift', status:'info' },
];
const OUTPUTS: Record<string, { title: string; meta: string; hue: number }[]> = {
  'UI Designer Agent': [
    { title:'Lumi Spa Studio — Homepage demo', meta:'Score 92 · Approved', hue:300 },
    { title:'GreenBite — Homepage demo', meta:'Score 90 · Sent', hue:140 },
    { title:'Atlas Dental — Homepage demo', meta:'Score 88 · In review', hue:200 },
  ],
};

function agentDetail(id: string): AgentDetail | null {
  const a = agentById(id);
  if (!a) return null;
  return {
    ...a,
    purpose: PURPOSE[a.role] || 'A specialized AI worker in the Agents Verse company.',
    skills: SKILLS[a.role] || ['Task execution','Quality control','Reporting'],
    tools: TOOLS[a.role] || ['Workspace','Knowledge base'],
    history: HISTORY[a.role] || DEFAULT_HISTORY,
    outputs: OUTPUTS[a.role] || [],
    approval: Math.round(a.quality * 0.92),
    maxTasks: 60,
    escalationThreshold: 80,
    chatPrompts: [
      'Why did you choose this visual style?',
      'Make this demo more premium.',
      'Show me the before/after reasoning.',
      'Prioritize the mobile layout.',
    ],
  };
}

// Room projects — derived from leads, consistent across the app
const ROOM_PROJECTS: Record<string, string[]> = {
  design: ['atlas-d','lumi','green','nova-r'],
  code:   ['urbanfit','lumi'],
  audit:  ['mekong','cedar','atlas-d'],
  sales:  ['nova-r','green','mekong'],
  support:['urbanfit'],
};
const PROJ_STATUS: Record<string, { label: string; cls: string; progress: number; next: string }> = {
  'atlas-d':{ label:'In review',    cls:'badge-warning', progress:82, next:'Visual QA → approve' },
  'lumi':   { label:'Approved',     cls:'badge-success', progress:100,next:'Hand to Code Lab' },
  'green':  { label:'Sent',         cls:'badge-info',    progress:100,next:'Awaiting client reply' },
  'nova-r': { label:'In progress',  cls:'badge-primary', progress:58, next:'Define brand direction' },
  'mekong': { label:'Auditing',     cls:'badge-primary', progress:40, next:'Finish conversion scan' },
  'cedar':  { label:'Queued',       cls:'badge-neutral', progress:12, next:'Start audit' },
  'urbanfit':{label:'Building',     cls:'badge-primary', progress:65, next:'QA review' },
};

function roomProjects(roomId: string): RoomProject[] {
  const ids = ROOM_PROJECTS[roomId] || [];
  return ids.map(id => {
    const l = leads.find(x => x.id === id)!;
    return { ...l, ...PROJ_STATUS[id] };
  });
}

const TIMELINE: Record<string, TimelineItem[]> = {
  design: [
    { t:'2m',  agent:'nova',  event:'Generated homepage demo for Lumi Spa Studio', status:'success' },
    { t:'18m', agent:'iris',  event:'Flagged mobile spacing on GreenBite hero', status:'review' },
    { t:'40m', agent:'kira',  event:'Approved Lumi Spa demo — visual QA passed', status:'success' },
    { t:'1h',  agent:'atlas', event:'Set premium visual direction for Nova Realty', status:'info' },
    { t:'2h',  agent:'nova',  event:'Started Atlas Dental homepage demo', status:'info' },
  ],
};
const DEFAULT_TIMELINE: TimelineItem[] = [
  { t:'6m',  agent:null, event:'Task completed and passed quality check', status:'success' },
  { t:'30m', agent:null, event:'New task pulled from the workflow', status:'info' },
  { t:'1h',  agent:null, event:'Room health recalculated', status:'info' },
];

function roomTimeline(roomId: string): TimelineItem[] {
  const room = roomById(roomId);
  const fallbackAgent = room ? room.agents[0] : null;
  return (TIMELINE[roomId] || DEFAULT_TIMELINE).map(e => ({
    ...e,
    agent: e.agent || fallbackAgent,
  }));
}

function roomMetrics(roomId: string): [string, string | number][] {
  const r = roomById(roomId)!;
  const M: Record<string, [string, string | number][]> = {
    design:  [['Demos today', r.done], ['Awaiting review','2'], ['Avg design score','91'], ['Pipeline value','$14.8k']],
    audit:   [['Audits today', r.done], ['High-potential','4'], ['Avg site score','39'], ['Redesign value','$13k']],
    sales:   [['Outreach sent','38'], ['Replies','7'], ['Deals to approve','2'], ['Forecast','$8.4k']],
    research:[['Scanned today','148'], ['Qualified','43'], ['Avg presence','41'], ['New today','+22']],
    code:    [['Builds today', r.done], ['Queued','1'], ['Avg build score','91'], ['Idle capacity','40%']],
    support: [['Active projects','2'], ['Open revisions','3'], ['Care clients','5'], ['CSAT','96%']],
    finance: [['Revenue today','$2.1k'], ['AI cost','$42.80'], ['Margin','81%'], ['Budget used','86%']],
    ceo:     [['Escalations','3'], ['Approved today','9'], ['Autonomy','Guarded'], ['Net profit','$6.9k']],
  };
  return M[roomId] || [['Tasks today', r.done], ['Running', r.running], ['Health', r.health+'%'], ['Agents', r.agents.length]];
}

/* =========================================================================
   DATA3 — Audits + demos
   ========================================================================= */

const INDUSTRY_HUE: Record<string, number> = {
  Healthcare:200, Wellness:300, Hospitality:140, 'Real Estate':40, Logistics:230, Fitness:20,
};

function hueFor(ind: string): number {
  return INDUSTRY_HUE[ind] || 220;
}

const REDESIGN: Record<string, Redesign> = {
  Healthcare:  { style:'Clean clinical-modern with warm trust cues', sections:['Booking-first hero','Services with outcomes','Doctors & credentials','Patient reviews','Insurance & FAQ','One-tap contact'], cta:'Book an appointment — sticky on mobile', content:'Reassuring, outcome-led, local', template:'Clinic demo template' },
  Wellness:    { style:'Editorial, calm, spa-luxe', sections:['Atmospheric hero','Treatment menu','Pricing & packages','Therapist profiles','Gallery','Online booking'], cta:'Book your session', content:'Sensory, premium, unhurried', template:'Spa demo template' },
  Hospitality: { style:'Appetite-driven, vivid, mobile-first', sections:['Photo hero','Live menu','Reservations','Reviews','Location & hours','Order online'], cta:'Reserve a table', content:'Mouth-watering, local, social', template:'Restaurant demo template' },
  'Real Estate':{ style:'Confident corporate with strong imagery', sections:['Search hero','Featured listings','Agent team','Sold results','Testimonials','Valuation CTA'], cta:'Get a free valuation', content:'Authoritative, results-led', template:'Realty demo template' },
  Logistics:   { style:'Industrial-clean, trust & scale', sections:['Capability hero','Services','Coverage map','Case results','Certifications','Quote request'], cta:'Request a quote', content:'Reliable, precise, B2B', template:'Logistics demo template' },
  Fitness:     { style:'Energetic, bold, conversion-led', sections:['Motion hero','Classes & plans','Pricing','Trainer profiles','Results','Free-trial CTA'], cta:'Start a free trial', content:'Motivating, direct, local', template:'Gym demo template' },
};

const SCORE_PROFILES: Record<string, ScoreProfile> = {
  'atlas-d': { visual:28, mobile:22, cta:30, trust:35, seo:48, speed:52, content:40, conversion:25 },
  'lumi':    { visual:44, mobile:40, cta:38, trust:46, seo:50, speed:58, content:42, conversion:36 },
  'green':   { visual:36, mobile:30, cta:34, trust:42, seo:44, speed:48, content:38, conversion:32 },
  'nova-r':  { visual:48, mobile:44, cta:42, trust:50, seo:52, speed:55, content:46, conversion:40 },
  'mekong':  { visual:26, mobile:24, cta:28, trust:32, seo:38, speed:44, content:30, conversion:22 },
  'cedar':   { visual:42, mobile:38, cta:40, trust:46, seo:50, speed:54, content:44, conversion:36 },
};

const SCORE_LABELS: ScoreLabelEntry[] = [
  ['visual','Visual design'],['mobile','Mobile UX'],['cta','CTA clarity'],['trust','Trust signals'],
  ['seo','SEO basics'],['speed','Speed impression'],['content','Content quality'],['conversion','Conversion potential'],
];

const PROBLEMS: string[] = [
  'Outdated visual design — template feels years behind competitors',
  'Weak mobile layout — content overflows and taps are cramped',
  'No clear primary call-to-action above the fold',
  'Core services buried and hard to scan',
  'Few trust signals — no reviews, credentials or guarantees',
  'Contact / booking flow takes too many steps',
];

function audit(leadId: string): AuditResult {
  const l = leads.find(x => x.id === leadId) || leads[0];
  const scores = SCORE_PROFILES[l.id] || { visual:l.site-6, mobile:l.site-10, cta:l.site-4, trust:l.site, seo:l.site+8, speed:l.site+14, content:l.site, conversion:l.site-12 };
  const red = REDESIGN[l.industry] || REDESIGN.Healthcare;
  return {
    ...l, scores, problems: PROBLEMS, redesign: red,
    confidence: Math.min(97, 70 + Math.round((l.score - l.site) / 2)),
    // data3.js:45 uses straight apostrophe in template literal (U+0027) + curly quotes for the CTA
    summary: `${l.company}'s current site scores ${l.site}/100 — dated visuals, weak mobile UX and an unclear path to action. The redesign opportunity is high: a ${red.style.toLowerCase()} homepage with a single clear “${red.cta}” path could lift conversion potential to ${l.score}+.`,
  };
}

function auditedLeads(): Lead[] {
  return leads.filter(l => ['audited','demo','contacted','replied','won'].includes(l.stage));
}

const DEMO_STATUS: DemoStatusMap = {
  review:  { label:'Needs review', cls:'badge-warning' },
  approved:{ label:'Approved',     cls:'badge-success' },
  sent:    { label:'Sent',         cls:'badge-info' },
  replied: { label:'Client replied',cls:'badge-violet' },
  won:     { label:'Won',          cls:'badge-success' },
  draft:   { label:'Generated',    cls:'badge-neutral' },
};

const CHANGES: Record<string, string[]> = {
  Healthcare:['Booking-first hero with sticky mobile CTA','Trust row: reviews, credentials, insurance','Services rewritten around patient outcomes','One-tap call & directions'],
  Wellness:['Atmospheric full-bleed hero','Clear treatment menu with pricing','Online booking in two taps','Therapist profiles for trust'],
  Hospitality:['Appetite-driven photo hero','Live, scannable menu','One-tap reservations everywhere','Reviews + map above the fold'],
  'Real Estate':['Search-led hero','Featured listings carousel','Sold-results proof section','Free-valuation lead capture'],
  Logistics:['Capability-led hero','Coverage map + service grid','Certifications & case results','Quote request form'],
  Fitness:['High-energy motion hero','Class schedule & plans','Transparent pricing','Free-trial capture'],
};

const NOTES: Record<string, string> = {
  'atlas-d':'Went clinical-modern with warm accents. Confidence held at 88 after Visual QA — held one round for mobile spacing.',
  'lumi':'Editorial spa direction. Approved first pass — strong hero, calm palette, booking flow tested clean.',
  'green':'Appetite-first. Sent with a friendly tone; client opened the demo twice.',
  'nova-r':'Corporate-confident. Client replied asking to speak with the owner — escalated.',
};

// Derived from static leads — screens that need the mutable leads list read from WorkspaceStateProvider
const demos: Demo[] = leads.filter(l => l.demo !== 'none').map(l => {
  const st = DEMO_STATUS[l.demo] || DEMO_STATUS.draft;
  return {
    id:'demo-'+l.id, leadId:l.id, business:l.company, industry:l.industry, city:l.city, url:l.url,
    oldScore:l.site, newScore:l.score, status:l.demo, statusLabel:st.label, statusCls:st.cls,
    agents:(l.id==='lumi'||l.id==='atlas-d'||l.id==='green')?['nova','kira']:(l.id==='nova-r')?['atlas','nova']:['nova'],
    generated:({'atlas-d':'2h ago','lumi':'40m ago','green':'3h ago','nova-r':'5h ago','urbanfit':'1d ago','mekong':'30m ago','cedar':'1h ago'} as Record<string,string>)[l.id]||'today',
    demoUrl:'demo.agentsverse.ai/'+l.id, clientStatus:l.demo, value:l.value,
    changes: CHANGES[l.industry] || CHANGES.Healthcare,
    notes: NOTES[l.id] || 'Generated from the audit and brand direction. Awaiting the next step in the workflow.',
    checklist: {
      'Responsive layout':true, 'Clear primary CTA':true, 'Strong hero section':true,
      'Trust elements':l.score>82, 'Contact / booking form':true, 'SEO basics':l.score>80, 'Brand consistency':l.score>85,
    },
    outreach: {
      subject:`A new homepage concept for ${l.company}`,
      // Curly quotes in body match source data3.js:87
      body:`Hi ${l.company.split(' ')[0]} team — we rebuilt your homepage as a working demo (no charge, no obligation). It loads fast, works on mobile, and makes “${(REDESIGN[l.industry]||REDESIGN.Healthcare).cta.toLowerCase()}” effortless. Take a look and tell us what you think.`,
    },
  };
});

function demoByLead(leadId: string): Demo | undefined {
  return demos.find(d => d.leadId === leadId);
}

/* =========================================================================
   DATA4 — Deals + inbound demo requests
   ========================================================================= */

const DEAL_STAGE = {
  pricing:  { label:'Pricing question',   cls:'badge-info' },
  created:  { label:'Deal created',       cls:'badge-primary' },
  quoted:   { label:'Quote prepared',     cls:'badge-primary' },
  approval: { label:'Approval required',  cls:'badge-warning' },
  call:     { label:'Human call requested',cls:'badge-danger' },
  won:      { label:'Won',                cls:'badge-success' },
  lost:     { label:'Lost',               cls:'badge-neutral' },
};

const deals: Deal[] = [
  { id:'d-nova', leadId:'nova-r', client:'Nova Realty Group', industry:'Real Estate', city:'Miami',
    pkg:'Business Website', price:2400, value:6400, probability:65, stage:'call',
    escReason:'Client explicitly asked to speak with the owner before committing to a $6.4k engagement.',
    aiRec:'Schedule a 15-minute founder call — high intent, deal value is above the auto-approve threshold.', conf:74,
    // Typographic apostrophes in message/suggested preserved from data4.js
    reply:{ kind:'Asked for call', message:'This looks genuinely impressive. Before we commit, I’d like a quick call with whoever owns this — can we set something up this week?',
      interpretation:'High intent. Wants human reassurance on a high-value deal — not a price objection.',
      suggested:'Absolutely — I’ll have our founder reach out to set up a short call this week. In the meantime, here’s the live demo to explore.' },
    production:null },
  { id:'d-mekong', leadId:'mekong', client:'Mekong Logistics', industry:'Logistics', city:'Ho Chi Minh City',
    pkg:'Business Website', price:5200, value:5200, probability:70, stage:'approval',
    escReason:'Quoted $5,200 for a 6-page B2B site — exceeds the $4,000 auto-approve limit.',
    aiRec:'Approve the quote. Pricing is within margin rules and the buyer is qualified and engaged.', conf:88,
    reply:{ kind:'Asked for price', message:'We’d want the full site plus a quote request form. What would that run us?',
      interpretation:'Ready to buy, asking scope + price. Clear path to close.',
      suggested:'For a 6-page site with a quote-request flow, that’s $5,200 one-time. I can have it live within ~10 days of getting your content.' },
    production:null },
  { id:'d-green', leadId:'green', client:'GreenBite Restaurant', industry:'Hospitality', city:'Brooklyn',
    pkg:'Landing Page', price:900, value:2400, probability:50, stage:'pricing',
    escReason:null,
    aiRec:'Safe to send the quote automatically — under the auto-quote threshold.', conf:84,
    reply:{ kind:'Asked for price', message:'Nice work on the demo. How much for the whole thing?',
      interpretation:'Price question, warm. Within auto-quote range.',
      suggested:'The landing page is $900 one-time, or $2,400 for a full multi-page site. Both start from the demo you just saw.' },
    production:null },
  { id:'d-lumi', leadId:'lumi', client:'Lumi Spa Studio', industry:'Wellness', city:'Singapore',
    pkg:'Business Website', price:2400, value:2800, probability:60, stage:'created',
    escReason:null,
    aiRec:'Continue — demo approved and sent. Awaiting the client’s decision.', conf:86,
    reply:{ kind:'Interested', message:'Love the calm look. Let me share with my partner and come back to you.',
      interpretation:'Positive, needs a second stakeholder. Light follow-up in 3 days.',
      suggested:'Wonderful — take your time. I’ll check back in a few days, and the demo link stays live for you both.' },
    production:null },
  { id:'d-urban', leadId:'urbanfit', client:'UrbanFit Gym', industry:'Fitness', city:'Bangkok',
    pkg:'Landing Page', price:2100, value:2100, probability:100, stage:'won',
    escReason:null, aiRec:'Production underway — waiting on client assets to continue.', conf:96,
    reply:{ kind:'Interested', message:'Let’s do it. Where do we start?',
      interpretation:'Closed. Move to production intake.',
      suggested:'Fantastic — I’ll send an intake checklist now so we can get your site live fast.' },
    production:{ phase:'Content requested', target:'Launch target: in 6 days', blocker:'Waiting on client assets',
      assets:[{ name:'Logo (vector)', got:true },{ name:'Team & class photos', got:false },{ name:'Class schedule', got:false },{ name:'Pricing details', got:true }],
      stages:[
        { name:'Deal won', done:true },{ name:'Intake', done:true },{ name:'Content requested', current:true },
        { name:'In production' },{ name:'QA review' },{ name:'Client review' },{ name:'Delivered' },{ name:'Monthly care' },
      ] } },
];

function dealByLead(id: string): Deal | undefined {
  return deals.find(d => d.leadId === id);
}

const REQ_STATUS: ReqStatusMap = {
  new:       { label:'New',        cls:'badge-warning' },
  reviewing: { label:'Reviewing',  cls:'badge-info' },
  contacted: { label:'Contacted',  cls:'badge-primary' },
  converted: { label:'Converted',  cls:'badge-success' },
  declined:  { label:'Declined',   cls:'badge-neutral' },
};

const demoRequests: DemoRequest[] = [
  { id:'rq1', business:'Bella Nails & Spa', url:'bellanails.example.com', industry:'Wellness', city:'Austin', name:'Bella Tran', email:'bella@bellanails.com', message:'Our site is from 2014 and looks awful on phones. Can you show us something better?', t:'12m ago', status:'new' },
  // Typographic apostrophe in message preserved from data4.js:74
  { id:'rq2', business:'Hudson Auto Repair', url:'', industry:'Automotive', city:'Newark', name:'Mike Delgado', email:'mike@hudsonauto.com', message:'We don’t have a website at all yet — heard you build a working demo first?', t:'1h ago', status:'new' },
  { id:'rq3', business:'Saigon Pho House', url:'saigonpho.example.com', industry:'Hospitality', city:'San Jose', name:'Linh Nguyen', email:'linh@saigonpho.com', message:'Want online ordering and a nicer menu page.', t:'3h ago', status:'reviewing' },
  { id:'rq4', business:'Peak Dental', url:'peakdental.example.com', industry:'Healthcare', city:'Denver', name:'Dr. Alan Reed', email:'office@peakdental.com', message:'Competitor sites look far better than ours. Help.', t:'yesterday', status:'contacted' },
  { id:'rq5', business:'GreenLeaf Landscaping', url:'greenleaf.example.com', industry:'Home Services', city:'Portland', name:'Sam Kerr', email:'sam@greenleaf.com', message:'Need more leads coming from our website.', t:'2 days ago', status:'converted' },
];

/* =========================================================================
   Single exported AV singleton — mirrors legacy window.AV shape exactly
   ========================================================================= */

export const AV: AVData = {
  // Base
  rooms, agents, leads, metrics, escalations, activity, stages, statusMap, fmt,
  agentById, roomById,
  // data2
  agentDetail, roomProjects, roomTimeline, roomMetrics,
  // data3
  SCORE_LABELS, DEMO_STATUS, hueFor, audit, auditedLeads, demos, demoByLead,
  // data4
  DEAL_STAGE, REQ_STATUS, deals, demoRequests, dealByLead,
};

export type {
  Room, Agent, Lead, Metrics, Escalation, ActivityItem, Stage, StatusMap, StatusMapEntry, Fmt, AVData,
  AgentDetail, RoomProject, TimelineItem, RoomMetrics,
  Redesign, ScoreProfile, ScoreLabelEntry, Demo, DemoStatusMap, AuditResult,
  DealStageMap, ReqStatusMap, Deal, DemoRequest,
} from './types';
