// Curated per-industry design DNA. The single biggest lever against "AI-generic" output: instead
// of asking the model to "be beautiful" (which regresses to its safe mean), we inject a specific,
// opinionated art direction — exact palette, a real font pairing, a layout archetype and a signature
// motif — so each demo has distinctive character. Pure data; safe in the worker tsx chain.

export interface DesignDNA {
  // Short name for the look (kept in the spec so the model commits to one direction).
  aesthetic: string;
  // Concrete palette guidance — real hex anchors, not "use a modern palette".
  palette: string;
  // A specific Google Fonts pairing (display × text). Never the default Inter/Poppins everywhere.
  fonts: string;
  // The structural archetype — pushes away from the symmetric, centered, evenly-spaced AI default.
  layout: string;
  // One signature visual idea that recurs and makes the page feel designed, not assembled.
  motif: string;
  // Photography / imagery direction so Unsplash picks feel intentional, not stock-random.
  imagery: string;
}

// Order matters: first keyword hit wins. Keep the matchers broad (industry strings vary).
const RULES: Array<{ match: RegExp; dna: DesignDNA }> = [
  {
    match: /real ?estate|property|realty|housing|bất động sản|nhà đất/i,
    dna: {
      aesthetic: 'Architectural-Digest editorial — quiet luxury, confident and calm',
      palette: 'Ink navy #0E1B2A base, warm bone #F4EFE7 canvas, single brass accent #C2944E. No blue→purple gradients.',
      fonts: 'Display: "Fraunces" (high-contrast serif). Text: "Inter Tight". Big display sizes, tight tracking.',
      layout: 'Asymmetric editorial grid: oversized hero imagery bleeding to the edge, generous left margin, large index numbers (01 / 02) labelling sections. Listings in an irregular masonry, not a tidy 3-up row.',
      motif: 'Thin 1px brass hairline rules + oversized section index numerals; price/stat figures set in the display serif.',
      imagery: 'Architectural & golden-hour interiors, lifestyle-in-place, wide negative space — never a generic skyline stock photo.',
    },
  },
  {
    match: /restaurant|food|cafe|coffee|hospitality|dining|bar|bistro|ẩm thực|nhà hàng|quán/i,
    dna: {
      aesthetic: 'Sensory & appetite-led — warm, tactile, magazine-like',
      palette: 'Charcoal #1A1614, cream #FBF6EE, terracotta/ember accent #C75D38, deep olive #4A5340.',
      fonts: 'Display: "Playfair Display". Text: "Work Sans". Menu prices in a mono ("Space Mono").',
      layout: 'Full-bleed food photography, overlapping image cards, a horizontally-scrolling menu/gallery strip, off-centre headlines.',
      motif: 'Hand-set menu rows with leader dots to the price; warm grain/paper texture overlay.',
      imagery: 'Close-up, steam, hands, texture — intimate and warm, never flat top-down stock plates.',
    },
  },
  {
    match: /health|dental|clinic|medical|hospital|care|nha khoa|phòng khám|y tế/i,
    dna: {
      aesthetic: 'Clinical-calm & trustworthy — clean, airy, reassuring',
      palette: 'Soft white #FBFDFE, calm teal #1E7A85, deep slate #19303A, mint wash #E6F2F1. High contrast, no neon.',
      fonts: 'Display: "Outfit". Text: "Inter". Friendly geometric, generous line-height.',
      layout: 'Roomy single-column rhythm with soft rounded cards, a sticky booking bar, clear step-by-step "how it works", trust badges row.',
      motif: 'Soft pill shapes + a calm pastel underglow behind key cards; large readable numbers for stats.',
      imagery: 'Real people, candid and warm (patients/staff), bright natural light — never sterile stock with stethoscopes.',
    },
  },
  {
    match: /fitness|gym|sport|training|athletic|thể hình|phòng gym/i,
    dna: {
      aesthetic: 'High-energy athletic — bold, kinetic, motivational',
      palette: 'Near-black #0B0B0D, electric lime #C6F03E or volt accent, concrete grey #2A2C30. Punchy contrast.',
      fonts: 'Display: "Anton" / "Archivo" (condensed heavy). Text: "Inter". HUGE uppercase headlines.',
      layout: 'Diagonal/angled section dividers, oversized condensed type, motion-blur imagery, a bold schedule grid.',
      motif: 'Outlined numerals, ticker/marquee of class names, angular clip-paths.',
      imagery: 'Sweat, movement, dramatic gym lighting — dynamic action, never posed stock fitness models.',
    },
  },
  {
    match: /spa|wellness|beauty|salon|yoga|massage|làm đẹp|thẩm mỹ/i,
    dna: {
      aesthetic: 'Serene boutique — soft, refined, spa-quiet',
      palette: 'Warm sand #EFE7DC, blush #E7D3CC, sage #9CA88F, espresso #3A322C. Muted and tonal.',
      fonts: 'Display: "Cormorant Garamond" (airy serif). Text: "Jost". Lots of whitespace, light weights.',
      layout: 'Calm vertical rhythm, large soft-focus imagery, centred but with generous asymmetric whitespace, slow scroll cadence.',
      motif: 'Thin botanical line-art accents; ultra-soft shadows; lowercase delicate labels.',
      imagery: 'Soft, tonal, natural textures (stone, linen, water) — never bright clinical stock.',
    },
  },
  {
    match: /law|legal|finance|account|consult|advisory|insurance|luật|tài chính|tư vấn/i,
    dna: {
      aesthetic: 'Establishment-modern — authoritative, precise, restrained',
      palette: 'Deep forest #10271F or oxford navy #14233B, warm ivory #F5F1E9, muted gold #B79A5B. Conservative, premium.',
      fonts: 'Display: "Libre Caslon Text" / "Newsreader". Text: "Inter Tight". Serif authority, tight grid.',
      layout: 'Strict editorial column grid, rule-lined sections, numbered practice areas, a confident dense footer.',
      motif: 'Hairline rules + small-caps eyebrows + a crest/monogram mark.',
      imagery: 'Architecture, handshake-free abstracts, restrained portraiture — never cheesy corporate stock.',
    },
  },
  {
    match: /tech|software|saas|app|digital|ai|startup|công nghệ|phần mềm/i,
    dna: {
      aesthetic: 'Refined product-modern — crisp, confident, not another purple SaaS',
      palette: 'Off-black #0C0D10, warm white #FAFAF8, one saturated brand hue (e.g. cobalt #2C5BFF) used sparingly. No purple→pink gradient.',
      fonts: 'Display: "Space Grotesk". Text: "Inter". Mono accents in "JetBrains Mono".',
      layout: 'Bento-grid feature blocks of varied sizes, a real-looking product UI mock, generous gutters, left-aligned headlines.',
      motif: 'Subtle grid/dotted backdrop, mono labels, a single glowing accent element.',
      imagery: 'Abstract gradients done tastefully + crisp product mocks — never literal robot/AI stock.',
    },
  },
];

const DEFAULT_DNA: DesignDNA = {
  aesthetic: 'Modern editorial — confident, premium, distinctly un-templated',
  palette: 'A near-black or deep jewel base, one warm neutral canvas, and a single restrained accent. Avoid blue→purple gradients.',
  fonts: 'A high-character display serif or grotesque paired with a clean neutral text face (not Poppins). Fluid type scale.',
  layout: 'Asymmetric editorial grid with generous margins, varied section rhythm, one oversized hero moment.',
  motif: 'A recurring signature element (hairline rules, index numerals, or a brand mark) that ties the page together.',
  imagery: 'Intentional, on-brand photography with strong negative space — never obvious stock.',
};

export function artDirectionFor(industry: string): DesignDNA {
  return RULES.find((r) => r.match.test(industry))?.dna ?? DEFAULT_DNA;
}
