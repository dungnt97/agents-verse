/* =========================================================================
   AGENTS VERSE — Phase 3 data: audits + demos
   ========================================================================= */
(function () {
  const INDUSTRY_HUE = { Healthcare:200, Wellness:300, Hospitality:140, 'Real Estate':40, Logistics:230, Fitness:20 };
  AV.hueFor = (ind) => INDUSTRY_HUE[ind] || 220;

  // ---- Audit reports ----
  const REDESIGN = {
    Healthcare:  { style:'Clean clinical-modern with warm trust cues', sections:['Booking-first hero','Services with outcomes','Doctors & credentials','Patient reviews','Insurance & FAQ','One-tap contact'], cta:'Book an appointment — sticky on mobile', content:'Reassuring, outcome-led, local', template:'Clinic demo template' },
    Wellness:    { style:'Editorial, calm, spa-luxe', sections:['Atmospheric hero','Treatment menu','Pricing & packages','Therapist profiles','Gallery','Online booking'], cta:'Book your session', content:'Sensory, premium, unhurried', template:'Spa demo template' },
    Hospitality: { style:'Appetite-driven, vivid, mobile-first', sections:['Photo hero','Live menu','Reservations','Reviews','Location & hours','Order online'], cta:'Reserve a table', content:'Mouth-watering, local, social', template:'Restaurant demo template' },
    'Real Estate':{ style:'Confident corporate with strong imagery', sections:['Search hero','Featured listings','Agent team','Sold results','Testimonials','Valuation CTA'], cta:'Get a free valuation', content:'Authoritative, results-led', template:'Realty demo template' },
    Logistics:   { style:'Industrial-clean, trust & scale', sections:['Capability hero','Services','Coverage map','Case results','Certifications','Quote request'], cta:'Request a quote', content:'Reliable, precise, B2B', template:'Logistics demo template' },
    Fitness:     { style:'Energetic, bold, conversion-led', sections:['Motion hero','Classes & plans','Pricing','Trainer profiles','Results','Free-trial CTA'], cta:'Start a free trial', content:'Motivating, direct, local', template:'Gym demo template' },
  };
  const SCORE_PROFILES = {
    'atlas-d': { visual:28, mobile:22, cta:30, trust:35, seo:48, speed:52, content:40, conversion:25 },
    'lumi':    { visual:44, mobile:40, cta:38, trust:46, seo:50, speed:58, content:42, conversion:36 },
    'green':   { visual:36, mobile:30, cta:34, trust:42, seo:44, speed:48, content:38, conversion:32 },
    'nova-r':  { visual:48, mobile:44, cta:42, trust:50, seo:52, speed:55, content:46, conversion:40 },
    'mekong':  { visual:26, mobile:24, cta:28, trust:32, seo:38, speed:44, content:30, conversion:22 },
    'cedar':   { visual:42, mobile:38, cta:40, trust:46, seo:50, speed:54, content:44, conversion:36 },
  };
  const SCORE_LABELS = [
    ['visual','Visual design'],['mobile','Mobile UX'],['cta','CTA clarity'],['trust','Trust signals'],
    ['seo','SEO basics'],['speed','Speed impression'],['content','Content quality'],['conversion','Conversion potential'],
  ];
  AV.SCORE_LABELS = SCORE_LABELS;
  const PROBLEMS = [
    'Outdated visual design — template feels years behind competitors',
    'Weak mobile layout — content overflows and taps are cramped',
    'No clear primary call-to-action above the fold',
    'Core services buried and hard to scan',
    'Few trust signals — no reviews, credentials or guarantees',
    'Contact / booking flow takes too many steps',
  ];
  AV.audit = function (leadId) {
    const l = AV.leads.find(x => x.id === leadId) || AV.leads[0];
    const scores = SCORE_PROFILES[l.id] || { visual:l.site-6, mobile:l.site-10, cta:l.site-4, trust:l.site, seo:l.site+8, speed:l.site+14, content:l.site, conversion:l.site-12 };
    const red = REDESIGN[l.industry] || REDESIGN.Healthcare;
    return {
      ...l, scores, problems: PROBLEMS, redesign: red,
      confidence: Math.min(97, 70 + Math.round((l.score - l.site) / 2)),
      summary: `${l.company}'s current site scores ${l.site}/100 — dated visuals, weak mobile UX and an unclear path to action. The redesign opportunity is high: a ${red.style.toLowerCase()} homepage with a single clear “${red.cta}” path could lift conversion potential to ${l.score}+.`,
    };
  };
  AV.auditedLeads = () => AV.leads.filter(l => ['audited','demo','contacted','replied','won'].includes(l.stage));

  // ---- Demos ----
  const DEMO_STATUS = {
    review:  { label:'Needs review', cls:'badge-warning' },
    approved:{ label:'Approved',     cls:'badge-success' },
    sent:    { label:'Sent',         cls:'badge-info' },
    replied: { label:'Client replied',cls:'badge-violet' },
    won:     { label:'Won',          cls:'badge-success' },
    draft:   { label:'Generated',    cls:'badge-neutral' },
  };
  AV.DEMO_STATUS = DEMO_STATUS;
  const CHANGES = {
    Healthcare:['Booking-first hero with sticky mobile CTA','Trust row: reviews, credentials, insurance','Services rewritten around patient outcomes','One-tap call & directions'],
    Wellness:['Atmospheric full-bleed hero','Clear treatment menu with pricing','Online booking in two taps','Therapist profiles for trust'],
    Hospitality:['Appetite-driven photo hero','Live, scannable menu','One-tap reservations everywhere','Reviews + map above the fold'],
    'Real Estate':['Search-led hero','Featured listings carousel','Sold-results proof section','Free-valuation lead capture'],
    Logistics:['Capability-led hero','Coverage map + service grid','Certifications & case results','Quote request form'],
    Fitness:['High-energy motion hero','Class schedule & plans','Transparent pricing','Free-trial capture'],
  };
  const NOTES = {
    'atlas-d':'Went clinical-modern with warm accents. Confidence held at 88 after Visual QA — held one round for mobile spacing.',
    'lumi':'Editorial spa direction. Approved first pass — strong hero, calm palette, booking flow tested clean.',
    'green':'Appetite-first. Sent with a friendly tone; client opened the demo twice.',
    'nova-r':'Corporate-confident. Client replied asking to speak with the owner — escalated.',
  };
  AV.demos = AV.leads.filter(l => l.demo !== 'none').map(l => {
    const st = DEMO_STATUS[l.demo] || DEMO_STATUS.draft;
    return {
      id:'demo-'+l.id, leadId:l.id, business:l.company, industry:l.industry, city:l.city, url:l.url,
      oldScore:l.site, newScore:l.score, status:l.demo, statusLabel:st.label, statusCls:st.cls,
      agents:(l.id==='lumi'||l.id==='atlas-d'||l.id==='green')?['nova','kira']:(l.id==='nova-r')?['atlas','nova']:['nova'],
      generated:({'atlas-d':'2h ago','lumi':'40m ago','green':'3h ago','nova-r':'5h ago','urbanfit':'1d ago','mekong':'30m ago','cedar':'1h ago'})[l.id]||'today',
      demoUrl:'demo.agentsverse.ai/'+l.id, clientStatus:l.demo, value:l.value,
      changes: CHANGES[l.industry] || CHANGES.Healthcare,
      notes: NOTES[l.id] || 'Generated from the audit and brand direction. Awaiting the next step in the workflow.',
      checklist: { 'Responsive layout':true, 'Clear primary CTA':true, 'Strong hero section':true, 'Trust elements':l.score>82, 'Contact / booking form':true, 'SEO basics':l.score>80, 'Brand consistency':l.score>85 },
      outreach: {
        subject:`A new homepage concept for ${l.company}`,
        body:`Hi ${l.company.split(' ')[0]} team — we rebuilt your homepage as a working demo (no charge, no obligation). It loads fast, works on mobile, and makes “${(REDESIGN[l.industry]||REDESIGN.Healthcare).cta.toLowerCase()}” effortless. Take a look and tell us what you think.`,
      },
    };
  });
  AV.demoByLead = (leadId) => AV.demos.find(d => d.leadId === leadId);
})();
