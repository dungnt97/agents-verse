import type { DiscoveredPlace } from './places-client';

// Within-batch dedup. The DB unique constraint on placeId handles cross-run dedup; this catches
// near-duplicates in a single search (placeId is not stable beyond ~12 months, so we also match
// fuzzily on name + address).

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|llc|ltd|co|corp|the)\b/g, '')
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalizeName(s).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export function isLikelyDuplicate(a: DiscoveredPlace, b: DiscoveredPlace, threshold = 0.8): boolean {
  if (a.id === b.id) return true;
  const nameSim = jaccard(tokens(a.displayName), tokens(b.displayName));
  const addrSim = jaccard(tokens(a.formattedAddress), tokens(b.formattedAddress));
  return nameSim >= threshold && addrSim >= 0.5;
}

export function dedupePlaces(places: DiscoveredPlace[]): DiscoveredPlace[] {
  const kept: DiscoveredPlace[] = [];
  for (const p of places) {
    if (!kept.some((k) => isLikelyDuplicate(k, p))) kept.push(p);
  }
  return kept;
}
