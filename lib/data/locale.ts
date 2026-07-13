// The language the generated demo's copy should be written in, inferred from the client's country (parsed
// from the Maps formatted address). Target markets are English-speaking (US/UK/AU/CA/IE) → English; a
// Vietnam address keeps Vietnamese (the project's original market). Pure + worker-safe. When the market
// planner lands, the market's own language can be passed instead of inferring here.
export function demoLanguageForAddress(address: string | null | undefined): string {
  return /vi[eệ]t\s?nam/i.test(address ?? '') ? 'Vietnamese' : 'English';
}
