/* =========================================================================
   AGENTS VERSE — Mock data (single source of truth)
   ========================================================================= */
window.AV = (function () {

  const rooms = [
    { id:'ceo',     name:'CEO Control Room',   short:'Control',  purpose:'Founder oversight, approvals & autonomy control.', status:'review',  agents:['ledger'], active:1, running:3,  done:11, health:96, mission:'3 escalations awaiting your decision', x:50, y:6,  pos:'top' },
    { id:'research',name:'Lead Research Room',  short:'Research', purpose:'Finds businesses with outdated or missing websites.', status:'active', agents:['orion'], active:1, running:6,  done:148,health:99, mission:'Scanning dental & hospitality in 3 cities', x:14, y:31 },
    { id:'audit',   name:'Website Audit Room',  short:'Audit',    purpose:'Scores current sites & finds redesign opportunities.', status:'active', agents:['vega'], active:1, running:4,  done:39, health:94, mission:'Auditing 4 high-potential leads', x:35, y:31 },
    { id:'design',  name:'Design Studio',       short:'Design',   purpose:'Creates website demo concepts & visual systems.', status:'active', agents:['atlas','nova','iris','kira'], active:3, running:4, done:12, health:91, mission:'4 demos in production, 2 awaiting review', x:50, y:57, pos:'hub' },
    { id:'code',    name:'Code Lab',            short:'Code',     purpose:'Converts approved demos into frontend builds.', status:'idle',   agents:['cipher'], active:0, running:1,  done:5,  health:88, mission:'1 build queued · idle capacity', x:65, y:31 },
    { id:'sales',   name:'Sales Room',          short:'Sales',    purpose:'Prepares outreach, handles replies, quotes packages.', status:'review', agents:['echo','closer'], active:2, running:5, done:38, health:90, mission:'7 replies · 2 deals need approval', x:86, y:31 },
    { id:'support', name:'Client Support Room', short:'Support',  purpose:'Handles client feedback, revisions & monthly care.', status:'active', agents:['mira'], active:1, running:2,  done:9,  health:97, mission:'2 active production projects', x:31, y:82 },
    { id:'finance', name:'Finance Room',        short:'Finance',  purpose:'Tracks revenue, AI cost, invoices & margin.', status:'warning',agents:['ledger'], active:1, running:2,  done:6,  health:82, mission:'AI cost approaching daily limit', x:69, y:82 },
  ];

  const agents = [
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

  const leads = [
    { id:'atlas-d', company:'Atlas Dental Clinic', industry:'Healthcare', city:'Houston',          url:'atlasdentalhou.com',     site:34, score:88, value:3200, agent:'nova',   stage:'demo',      demo:'review' },
    { id:'lumi',    company:'Lumi Spa Studio',     industry:'Wellness',   city:'Singapore',        url:'lumispa.sg',             site:41, score:84, value:2800, agent:'nova',   stage:'demo',      demo:'approved' },
    { id:'green',   company:'GreenBite Restaurant',industry:'Hospitality',city:'Brooklyn',         url:'greenbite.nyc',          site:38, score:81, value:2400, agent:'iris',   stage:'contacted', demo:'sent' },
    { id:'nova-r',  company:'Nova Realty Group',   industry:'Real Estate',city:'Miami',            url:'novarealtygrp.com',      site:46, score:90, value:6400, agent:'atlas',  stage:'replied',   demo:'replied' },
    { id:'mekong',  company:'Mekong Logistics',    industry:'Logistics',  city:'Ho Chi Minh City', url:'mekong-log.vn',          site:29, score:76, value:5200, agent:'vega',   stage:'audited',   demo:'draft' },
    { id:'urbanfit',company:'UrbanFit Gym',        industry:'Fitness',    city:'Bangkok',          url:'urbanfitbkk.com',        site:52, score:72, value:2100, agent:'mira',   stage:'won',       demo:'won' },
    { id:'cedar',   company:'Cedar Vet Clinic',    industry:'Healthcare', city:'Da Nang',          url:'cedarvet.vn',            site:44, score:79, value:2600, agent:'vega',   stage:'audited',   demo:'draft' },
    { id:'north',   company:'Northwind Roastery',  industry:'Hospitality',city:'Hanoi',            url:'northwind.coffee',       site:37, score:83, value:1900, agent:'orion',  stage:'found',     demo:'none' },
  ];

  // today's headline metrics
  const metrics = {
    scanned:148, leads:43, demos:12, outreach:38, replies:7, won:2,
    forecast:8400, cost:42.80, costLimit:50, escalations:3, online:17, inProgress:42, completed:238,
    margin:81, netProfit:6940,
  };

  const escalations = [
    { id:'e1', kind:'human', sev:'high',   title:'Client asked to speak with the owner', who:'Nova Realty Group', value:6400, agent:'closer', reason:'Client explicitly requested a human call before committing to a $6.4k deal.', rec:'Schedule a 15-min founder call — high intent, deal above auto-approve threshold.', conf:74, time:'8 min ago' },
    { id:'e2', kind:'deal',  sev:'high',   title:'Deal value above approval threshold', who:'Mekong Logistics',  value:5200, agent:'closer', reason:'Quoted $5,200 for a 6-page business site. Auto-approve limit is $4,000.', rec:'Approve quote — pricing is within margin rules and client is qualified.', conf:88, time:'22 min ago' },
    { id:'e3', kind:'cost',  sev:'medium', title:'AI cost approaching daily limit',     who:'Finance Room',      value:0,    agent:'ledger', reason:'Daily spend at $42.80 of $50.00 (84%). Demo generation queue still active.', rec:'Raise today’s budget by $20 or pause non-critical generation until tomorrow.', conf:83, time:'35 min ago' },
  ];

  const activity = [
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

  const stages = [
    { id:'found',     label:'Found' },
    { id:'audited',   label:'Audited' },
    { id:'demo',      label:'Demo Generated' },
    { id:'contacted', label:'Contacted' },
    { id:'replied',   label:'Replied' },
    { id:'won',       label:'Deal Won' },
  ];

  const statusMap = {
    active:   { label:'Active',       cls:'badge-success', dot:'var(--success)' },
    working:  { label:'Working',      cls:'badge-success', dot:'var(--success)' },
    idle:     { label:'Idle',         cls:'badge-neutral', dot:'var(--ink-3)' },
    waiting:  { label:'Waiting',      cls:'badge-info',    dot:'var(--info)' },
    warning:  { label:'Warning',      cls:'badge-warning', dot:'var(--warning)' },
    review:   { label:'Needs review', cls:'badge-warning', dot:'var(--warning)' },
    escalate: { label:'Escalating',   cls:'badge-danger',  dot:'var(--danger)' },
    paused:   { label:'Paused',       cls:'badge-neutral', dot:'var(--ink-3)' },
  };

  const fmt = {
    money: (n) => '$' + n.toLocaleString('en-US'),
    money2:(n) => '$' + n.toFixed(2),
    k:     (n) => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : '$' + n,
  };

  const agentById = (id) => agents.find(a => a.id === id);
  const roomById  = (id) => rooms.find(r => r.id === id);

  return { rooms, agents, leads, metrics, escalations, activity, stages, statusMap, fmt, agentById, roomById };
})();
