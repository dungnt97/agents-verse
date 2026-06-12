/* =========================================================================
   AGENTS VERSE — Phase 2 data: room & agent detail helpers
   ========================================================================= */
(function () {
  const SKILLS = {
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
  const TOOLS = {
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
  const PURPOSE = {
    'Lead Hunter Agent':     'Continuously finds local businesses whose web presence is outdated, weak, or missing — and ranks them by redesign potential.',
    'Website Critic Agent':  'Audits a target site across design, mobile, trust and conversion, producing a score and a prioritized problem list.',
    'Brand Strategist Agent':'Sets the visual direction and brand system each demo should follow, tuned to the client’s industry and audience.',
    'UI Designer Agent':     'Creates high-conversion website demo interfaces from an audit and a brand direction — the working preview a client first sees.',
    'UX Reviewer Agent':     'Reviews demo flows for clarity and mobile usability before they reach a client, flagging friction early.',
    'Visual QA Agent':       'Final visual quality gate — checks pixels, spacing, contrast and brand consistency across devices.',
    'Frontend Coder Agent':  'Turns an approved demo into a production frontend build, responsive and ready to deploy.',
    'Outreach Agent':        'Drafts personalized, on-brand outreach with the demo link, matched to channel and tone — always within guardrails.',
    'Sales Closer Agent':    'Reads client replies, handles objections, prepares quotes, and escalates the decisions that need a human.',
    'Support Agent':         'Collects assets, manages revisions and runs monthly care for live clients.',
    'Finance Agent':         'Tracks revenue, AI cost, invoices and margin — and raises an alert before a budget is breached.',
  };

  const HISTORY = {
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
  const OUTPUTS = {
    'UI Designer Agent': [
      { title:'Lumi Spa Studio — Homepage demo', meta:'Score 92 · Approved', hue:300 },
      { title:'GreenBite — Homepage demo', meta:'Score 90 · Sent', hue:140 },
      { title:'Atlas Dental — Homepage demo', meta:'Score 88 · In review', hue:200 },
    ],
  };

  AV.agentDetail = function (id) {
    const a = AV.agentById(id); if (!a) return null;
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
  };

  // Room projects — derived from leads, consistent across the app
  const ROOM_PROJECTS = {
    design: ['atlas-d','lumi','green','nova-r'],
    code:   ['urbanfit','lumi'],
    audit:  ['mekong','cedar','atlas-d'],
    sales:  ['nova-r','green','mekong'],
    support:['urbanfit'],
  };
  const PROJ_STATUS = {
    'atlas-d':{ label:'In review',    cls:'badge-warning', progress:82, next:'Visual QA → approve' },
    'lumi':   { label:'Approved',     cls:'badge-success', progress:100,next:'Hand to Code Lab' },
    'green':  { label:'Sent',         cls:'badge-info',    progress:100,next:'Awaiting client reply' },
    'nova-r': { label:'In progress',  cls:'badge-primary', progress:58, next:'Define brand direction' },
    'mekong': { label:'Auditing',     cls:'badge-primary', progress:40, next:'Finish conversion scan' },
    'cedar':  { label:'Queued',       cls:'badge-neutral', progress:12, next:'Start audit' },
    'urbanfit':{label:'Building',     cls:'badge-primary', progress:65, next:'QA review' },
  };
  AV.roomProjects = function (roomId) {
    const ids = ROOM_PROJECTS[roomId] || [];
    return ids.map(id => { const l = AV.leads.find(x=>x.id===id); return { ...l, ...PROJ_STATUS[id] }; });
  };

  const TIMELINE = {
    design: [
      { t:'2m',  agent:'nova',  event:'Generated homepage demo for Lumi Spa Studio', status:'success' },
      { t:'18m', agent:'iris',  event:'Flagged mobile spacing on GreenBite hero', status:'review' },
      { t:'40m', agent:'kira',  event:'Approved Lumi Spa demo — visual QA passed', status:'success' },
      { t:'1h',  agent:'atlas', event:'Set premium visual direction for Nova Realty', status:'info' },
      { t:'2h',  agent:'nova',  event:'Started Atlas Dental homepage demo', status:'info' },
    ],
  };
  const DEFAULT_TIMELINE = [
    { t:'6m',  agent:null, event:'Task completed and passed quality check', status:'success' },
    { t:'30m', agent:null, event:'New task pulled from the workflow', status:'info' },
    { t:'1h',  agent:null, event:'Room health recalculated', status:'info' },
  ];
  AV.roomTimeline = (roomId) => (TIMELINE[roomId] || DEFAULT_TIMELINE).map(e => ({ ...e, agent: e.agent || (AV.roomById(roomId).agents[0]) }));

  AV.roomMetrics = function (roomId) {
    const r = AV.roomById(roomId);
    const M = {
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
  };
})();
