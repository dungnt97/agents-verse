/* =========================================================================
   AGENTS VERSE — Phase 4 data: deals (reply → quote → approval → production)
   ========================================================================= */
(function () {
  const STAGE = {
    pricing:  { label:'Pricing question',  cls:'badge-info' },
    created:  { label:'Deal created',      cls:'badge-primary' },
    quoted:   { label:'Quote prepared',    cls:'badge-primary' },
    approval: { label:'Approval required',  cls:'badge-warning' },
    call:     { label:'Human call requested',cls:'badge-danger' },
    won:      { label:'Won',               cls:'badge-success' },
    lost:     { label:'Lost',              cls:'badge-neutral' },
  };
  AV.DEAL_STAGE = STAGE;

  AV.deals = [
    { id:'d-nova', leadId:'nova-r', client:'Nova Realty Group', industry:'Real Estate', city:'Miami',
      pkg:'Business Website', price:2400, value:6400, probability:65, stage:'call',
      escReason:'Client explicitly asked to speak with the owner before committing to a $6.4k engagement.',
      aiRec:'Schedule a 15-minute founder call — high intent, deal value is above the auto-approve threshold.', conf:74,
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
          { name:'In production', },{ name:'QA review' },{ name:'Client review' },{ name:'Delivered' },{ name:'Monthly care' },
        ] } },
  ];
  AV.dealByLead = (id) => AV.deals.find(d => d.leadId === id);

  // ---- Inbound demo requests (public landing → admin inbox) ----
  AV.REQ_STATUS = {
    new:       { label:'New',        cls:'badge-warning' },
    reviewing: { label:'Reviewing',  cls:'badge-info' },
    contacted: { label:'Contacted',  cls:'badge-primary' },
    converted: { label:'Converted',  cls:'badge-success' },
    declined:  { label:'Declined',   cls:'badge-neutral' },
  };
  AV.demoRequests = [
    { id:'rq1', business:'Bella Nails & Spa', url:'bellanails.example.com', industry:'Wellness', city:'Austin', name:'Bella Tran', email:'bella@bellanails.com', message:'Our site is from 2014 and looks awful on phones. Can you show us something better?', t:'12m ago', status:'new' },
    { id:'rq2', business:'Hudson Auto Repair', url:'', industry:'Automotive', city:'Newark', name:'Mike Delgado', email:'mike@hudsonauto.com', message:'We don’t have a website at all yet — heard you build a working demo first?', t:'1h ago', status:'new' },
    { id:'rq3', business:'Saigon Pho House', url:'saigonpho.example.com', industry:'Hospitality', city:'San Jose', name:'Linh Nguyen', email:'linh@saigonpho.com', message:'Want online ordering and a nicer menu page.', t:'3h ago', status:'reviewing' },
    { id:'rq4', business:'Peak Dental', url:'peakdental.example.com', industry:'Healthcare', city:'Denver', name:'Dr. Alan Reed', email:'office@peakdental.com', message:'Competitor sites look far better than ours. Help.', t:'yesterday', status:'contacted' },
    { id:'rq5', business:'GreenLeaf Landscaping', url:'greenleaf.example.com', industry:'Home Services', city:'Portland', name:'Sam Kerr', email:'sam@greenleaf.com', message:'Need more leads coming from our website.', t:'2 days ago', status:'converted' },
  ];
})();
