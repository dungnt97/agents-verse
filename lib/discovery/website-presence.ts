// "Already has a real website?" gate for the autonomous hunter. We should NOT spend a demo on a business
// that already runs a real, working standalone site — only on those with NO web presence, a social-only
// presence (Facebook/Instagram/linktree — nothing they own), or a dead link. Worker-safe (no framework
// imports): used by the discovery core's auto-chain.

// A "website" on one of these hosts is a SOCIAL / directory / messaging profile, not the business's own
// site — so the business still needs a real one and stays a target.
const SOCIAL_HOSTS = [
  'facebook.com', 'fb.com', 'fb.me',
  'instagram.com', 'instagr.am',
  'linktr.ee', 'lnk.bio', 'beacons.ai', 'linkin.bio', 'tap.bio', 'solo.to', 'carrd.co',
  'tiktok.com', 'twitter.com', 'x.com',
  'yelp.com', 'foursquare.com',
  'g.page', 'maps.app.goo.gl', 'goo.gl', // a Google Maps/Business link, not their own site
  'wa.me', 't.me', 'api.whatsapp.com',
];
// Brand fragments to catch country-TLD variants (facebook.fr, tripadvisor.co.uk, yelp.ca, instagram.de).
const SOCIAL_SUBSTR = ['facebook.', 'instagram.', 'tripadvisor.', 'yelp.'];

export function isSocialOrDirectory(rawUrl: string): boolean {
  let host: string;
  try {
    host = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return false; // unparseable — let the reachability check govern
  }
  return SOCIAL_HOSTS.some((d) => host === d || host.endsWith('.' + d)) || SOCIAL_SUBSTR.some((s) => host.includes(s));
}

// True when the business already runs a real, working standalone website — a URL that is neither a
// social/directory profile nor a dead link (the discovery reachability probe actually fetched a page).
// Such leads are SKIPPED by the auto-hunter (no demo). `reachable` comes from the bad-website heuristic's
// live assessment; a URL that couldn't be fetched (dead/parked) is treated as "no working site" → target.
export function hasRealWebsite(websiteUri: string | null | undefined, reachable: boolean): boolean {
  if (!websiteUri || !websiteUri.trim()) return false;
  if (isSocialOrDirectory(websiteUri)) return false;
  return reachable;
}
