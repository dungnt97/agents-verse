// The catalog of markets the autonomous hunter can target — rich, high-spend, English-speaking countries
// (the founder pool in settings.marketPlan selects a SUBSET of this). Pure data + types, worker-safe (no
// framework imports) so both the web action and the Phase-4 cron can use it. `code` is the ISO-3166
// country code used to geo-bias the Maps query; metros are the display strings put into the search.
export interface MarketCountry {
  code: string; // ISO 3166-1 alpha-2 (US, GB, AU, CA, IE) — passed as regionCode/countryCode to the provider
  name: string;
  language: string; // demo/outreach copy language for this market
  metros: string[]; // high-spend metros, as the "city" portion of the search string
}

export const MARKET_CATALOG: MarketCountry[] = [
  { code: 'US', name: 'United States', language: 'English', metros: ['Austin TX', 'Miami FL', 'Dallas TX', 'Phoenix AZ', 'Denver CO', 'Seattle WA', 'Atlanta GA', 'Charlotte NC', 'Nashville TN', 'San Diego CA'] },
  { code: 'GB', name: 'United Kingdom', language: 'English', metros: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Bristol'] },
  { code: 'AU', name: 'Australia', language: 'English', metros: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Gold Coast'] },
  { code: 'CA', name: 'Canada', language: 'English', metros: ['Toronto', 'Vancouver', 'Calgary', 'Ottawa', 'Edmonton'] },
  { code: 'IE', name: 'Ireland', language: 'English', metros: ['Dublin', 'Cork', 'Galway'] },
];

// SMB niches with clear web-redesign upside + the budget to buy. The founder pool picks a subset.
export const MARKET_NICHES: string[] = [
  'nail salons',
  'dental clinics',
  'med spas',
  'hair salons',
  'chiropractors',
  'law firms',
  'hvac contractors',
  'plumbers',
  'roofers',
  'real estate agents',
  'dentists',
  'physiotherapists',
  'veterinary clinics',
  'gyms',
];

export function countryByCode(code: string): MarketCountry | undefined {
  return MARKET_CATALOG.find((c) => c.code === code);
}
