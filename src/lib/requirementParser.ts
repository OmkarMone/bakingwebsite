import type { CakeRequirementsInput } from "@/lib/types";

/**
 * Deterministic free-text → requirements parser. Runs everywhere (client + server) and is the
 * fallback when the AI parser is unavailable. The AI parser refines, never replaces, user edits.
 */

const FLAVORS = [
  "red velvet", "black forest", "white forest", "tres leches", "carrot", "chocolate", "dark chocolate", "white chocolate",
  "vanilla", "lemon", "banana", "coffee", "mocha", "pineapple", "strawberry", "mango", "butterscotch", "coconut", "almond",
  "pistachio", "matcha", "pandan", "ube", "orange", "marble", "funfetti", "honey", "rose", "cardamom", "rasmalai",
  "gulab jamun", "biscoff", "oreo", "nutella", "blueberry", "raspberry", "cherry", "apple", "walnut", "date", "caramel",
  "salted caramel", "hazelnut", "earl grey", "passion fruit", "peanut butter", "cinnamon", "ginger", "pumpkin", "fruit",
  "plum", "kesar", "saffron", "thandai", "rainbow", "lavender", "yuzu", "durian", "black sesame", "taro", "milo",
];

const STYLES = [
  "cheesecake", "chiffon cake", "sponge cake", "pound cake", "bundt cake", "layer cake", "sheet cake", "cupcakes", "cupcake",
  "loaf cake", "tea cake", "swiss roll", "roll cake", "genoise", "angel food cake", "mug cake", "bento cake", "castella",
  "upside down cake", "drip cake", "fruit cake", "plum cake", "lava cake", "molten cake", "torte", "gateau",
];

const COUNTRIES: Record<string, [string, string]> = {
  singapore: ["sg", "Singapore"], india: ["in", "India"], malaysia: ["my", "Malaysia"], "kuala lumpur": ["my", "Kuala Lumpur, Malaysia"],
  indonesia: ["id", "Indonesia"], jakarta: ["id", "Jakarta, Indonesia"], philippines: ["ph", "Philippines"], manila: ["ph", "Manila, Philippines"],
  thailand: ["th", "Thailand"], bangkok: ["th", "Bangkok, Thailand"], "hong kong": ["hk", "Hong Kong"], japan: ["jp", "Japan"],
  australia: ["au", "Australia"], sydney: ["au", "Sydney, Australia"], melbourne: ["au", "Melbourne, Australia"],
  "new zealand": ["nz", "New Zealand"], "united kingdom": ["gb", "United Kingdom"], uk: ["gb", "United Kingdom"],
  london: ["gb", "London, UK"], "united states": ["us", "United States"], usa: ["us", "United States"], canada: ["ca", "Canada"],
  toronto: ["ca", "Toronto, Canada"], uae: ["ae", "United Arab Emirates"], dubai: ["ae", "Dubai, UAE"],
  mumbai: ["in", "Mumbai, India"], delhi: ["in", "Delhi, India"], bangalore: ["in", "Bengaluru, India"], bengaluru: ["in", "Bengaluru, India"],
  pune: ["in", "Pune, India"], hyderabad: ["in", "Hyderabad, India"], chennai: ["in", "Chennai, India"], kolkata: ["in", "Kolkata, India"],
  "new york": ["us", "New York, USA"], ireland: ["ie", "Ireland"], germany: ["de", "Germany"], "south africa": ["za", "South Africa"],
};

const OCCASIONS: [RegExp, string, CakeRequirementsInput["decorationStyle"]][] = [
  [/\bbirthday\b/, "Birthday", "birthday"],
  [/\bwedding\b/, "Wedding", "wedding"],
  [/\banniversary\b/, "Anniversary", "anniversary"],
  [/\b(kids?|children|child'?s)\b/, "Kids party", "kids"],
  [/\bbento\b/, "Bento cake", "bento"],
  [/\b(cartoon|character|unicorn|frozen|spider-?man|peppa)\b/, "Character cake", "cartoon"],
  [/\bfloral|flowers?\b/, "Floral", "floral"],
  [/\bvintage|lambeth\b/, "Vintage", "vintage"],
  [/\bminimalist|simple|plain\b/, "Simple", "minimalist"],
  [/\b(celebration|party|christmas|diwali|eid|graduation)\b/, "Celebration", "celebration"],
];

const has = (s: string, re: RegExp) => re.test(s);

export function heuristicParse(query: string): CakeRequirementsInput {
  const q = query.toLowerCase().replace(/\s+/g, " ").trim();

  // Weight
  let weightGrams: number | null = null;
  const half = q.match(/\b(half|1\/2|0\.5)\s?(kg|kilo)/);
  const w = q.match(/(\d+(?:\.\d+)?)\s?(kg|kgs|kilo(?:gram)?s?|g|gm|gms|grams?|lbs?|pounds?)\b/);
  if (half) weightGrams = 500;
  else if (w) {
    const n = parseFloat(w[1]);
    const u = w[2];
    weightGrams = /^k/.test(u) ? n * 1000 : /^(lb|pound)/.test(u) ? n * 454 : n;
    weightGrams = Math.round(weightGrams);
    if (weightGrams < 150 || weightGrams > 10000) weightGrams = null;
  }

  // Servings
  const s = q.match(/(?:serves?|for)\s?(\d{1,3})\s?(people|persons|guests|pax|servings|kids|adults)?/) ?? q.match(/(\d{1,3})\s?(people|persons|guests|pax|servings|slices)/);
  const servings = s && (s[2] || /serves?/.test(s[0])) ? Number(s[1]) : null;

  // Diet
  const vegan = has(q, /\bvegan|plant[- ]based\b/) ? true : null;
  const eggless = vegan || has(q, /\beggless|egg[- ]?free|without eggs?|no eggs?|egg ?less\b/) ? true : null;
  const glutenFree = has(q, /\bgluten[- ]?free|gf\b|celiac|coeliac/) ? true : null;
  const dairyFree = vegan || has(q, /\bdairy[- ]?free|lactose[- ]free|no dairy|without (milk|dairy)/) ? true : null;

  // Appliance
  let appliance: CakeRequirementsInput["appliance"] = null;
  if (has(q, /\botg\b|toaster oven/)) appliance = "otg";
  else if (has(q, /air ?fryer/)) appliance = "air_fryer";
  else if (has(q, /microwave/)) appliance = "microwave";
  else if (has(q, /pressure cooker|cooker|kadai|kadhai|no oven|without (an )?oven|stovetop/)) appliance = "pressure_cooker";
  else if (has(q, /\boven\b/)) appliance = "oven";

  // Sweetness
  const sweetness: CakeRequirementsInput["sweetness"] = has(q, /less sweet|not (too|very) sweet|low[- ]sugar|reduced sugar|mildly sweet/)
    ? "less"
    : has(q, /extra sweet|very sweet|sweeter/)
      ? "extra"
      : null;

  // Texture
  const textures = ["moist", "fluffy", "soft", "light", "airy", "dense", "fudgy", "spongy", "tender", "rich", "velvety", "crumbly", "springy"].filter((t) =>
    new RegExp(`\\b${t}\\b`).test(q),
  );
  const texture = textures.length ? textures.map((t, i) => (i === 0 ? t[0].toUpperCase() + t.slice(1) : t)).join(" and ") : null;

  // Frosting
  const frostingMatch = [
    [/swiss meringue/, "Swiss meringue buttercream"],
    [/italian meringue/, "Italian meringue buttercream"],
    [/white chocolate ganache/, "White chocolate ganache"],
    [/(chocolate )?ganache/, "Chocolate ganache"],
    [/cream cheese/, "Cream cheese frosting"],
    [/whipped cream|whipping cream|fresh cream/, "Whipped cream"],
    [/chocolate (frosting|icing)/, "Chocolate frosting"],
    [/buttercream|butter cream/, "Buttercream"],
    [/fondant/, "Fondant over buttercream"],
    [/no frosting|unfrosted|without frosting|naked/, "No frosting"],
  ] as const;
  const frosting = frostingMatch.find(([re]) => re.test(q))?.[1] ?? null;

  // Flavor + style
  const flavor = [...FLAVORS].sort((a, b) => b.length - a.length).find((f) => new RegExp(`\\b${f}\\b`).test(q)) ?? null;
  const style = [...STYLES].sort((a, b) => b.length - a.length).find((st) => q.includes(st)) ?? null;
  const cap = (x: string) => x.replace(/\b\w/g, (c) => c.toUpperCase());
  let cakeType = "Cake";
  if (style && flavor) cakeType = cap(`${flavor} ${style}`);
  else if (style) cakeType = cap(style);
  else if (flavor) cakeType = cap(`${flavor} cake`);

  // Occasion / decoration
  const occ = OCCASIONS.find(([re]) => re.test(q));

  // Location
  const country = Object.keys(COUNTRIES)
    .sort((a, b) => b.length - a.length)
    .find((k) => new RegExp(`\\b${k}\\b`).test(q));
  const location = country
    ? { label: COUNTRIES[country][1], countryCode: COUNTRIES[country][0], lat: null, lon: null, precise: false }
    : null;

  return {
    query: query.slice(0, 600),
    cakeType,
    flavor: flavor ? cap(flavor) : null,
    eggless,
    dairyFree,
    glutenFree,
    vegan,
    weightGrams,
    servings,
    appliance,
    sweetness,
    texture,
    frosting,
    decorationStyle: occ?.[2] ?? null,
    occasion: occ?.[1] ?? null,
    location,
  };
}

/** Rough servings estimate from finished weight (party slice ≈ 80–100 g). */
export function estimateServings(weightGrams: number | null | undefined): number | null {
  return weightGrams ? Math.max(2, Math.round(weightGrams / 90)) : null;
}
