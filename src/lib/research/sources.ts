/**
 * Source reputation table.
 *
 * "trusted"      — test kitchens / recipe developers known for tested, detailed baking recipes
 * "established"  — large reputable publishers or community sites with real review volume
 * Anything else is "unknown" and must earn its rank through ratings, detail and technique.
 *
 * No domain gets an automatic win: reliability is only 20 of 100 ranking points.
 */
export type Tier = "trusted" | "established" | "unknown";

interface SourceInfo {
  name: string;
  tier: Exclude<Tier, "unknown">;
  region?: "global" | "in" | "asia" | "uk" | "au";
  specialty?: ("eggless" | "vegan" | "gluten_free")[];
}

export const KNOWN_SOURCES: Record<string, SourceInfo> = {
  // Global baking specialists / test kitchens
  "kingarthurbaking.com": { name: "King Arthur Baking", tier: "trusted" },
  "seriouseats.com": { name: "Serious Eats", tier: "trusted" },
  "bbcgoodfood.com": { name: "BBC Good Food", tier: "trusted", region: "uk" },
  "sallysbakingaddiction.com": { name: "Sally's Baking Recipes", tier: "trusted" },
  "preppykitchen.com": { name: "Preppy Kitchen", tier: "trusted" },
  "handletheheat.com": { name: "Handle the Heat", tier: "trusted" },
  "biggerbolderbaking.com": { name: "Bigger Bolder Baking", tier: "trusted" },
  "bakerbettie.com": { name: "Baker Bettie", tier: "trusted" },
  "smittenkitchen.com": { name: "Smitten Kitchen", tier: "trusted" },
  "livforcake.com": { name: "Liv for Cake", tier: "trusted" },
  "cakebycourtney.com": { name: "Cake by Courtney", tier: "trusted" },
  "chelsweets.com": { name: "Chelsweets", tier: "trusted" },
  "sugarspunrun.com": { name: "Sugar Spun Run", tier: "trusted" },
  "joyofbaking.com": { name: "Joy of Baking", tier: "trusted" },
  "americastestkitchen.com": { name: "America's Test Kitchen", tier: "trusted" },
  "bonappetit.com": { name: "Bon Appétit", tier: "trusted" },
  "recipetineats.com": { name: "RecipeTin Eats", tier: "trusted", region: "au" },
  "janespatisserie.com": { name: "Jane's Patisserie", tier: "trusted", region: "uk" },
  "nigella.com": { name: "Nigella Lawson", tier: "trusted", region: "uk" },
  "bakingmad.com": { name: "Baking Mad", tier: "established", region: "uk" },
  "deliciousmagazine.co.uk": { name: "Delicious Magazine", tier: "established", region: "uk" },
  "taste.com.au": { name: "taste.com.au", tier: "established", region: "au" },
  "epicurious.com": { name: "Epicurious", tier: "established" },
  "thekitchn.com": { name: "The Kitchn", tier: "established" },
  "simplyrecipes.com": { name: "Simply Recipes", tier: "established" },
  "food52.com": { name: "Food52", tier: "established" },
  "foodnetwork.com": { name: "Food Network", tier: "established" },
  "marthastewart.com": { name: "Martha Stewart", tier: "established" },
  "allrecipes.com": { name: "Allrecipes", tier: "established" },
  "tasty.co": { name: "Tasty", tier: "established" },
  "delish.com": { name: "Delish", tier: "established" },
  "cooking.nytimes.com": { name: "NYT Cooking", tier: "trusted" },
  "bbc.co.uk": { name: "BBC Food", tier: "trusted", region: "uk" },
  "food.com": { name: "Food.com", tier: "established" },

  // India
  "vegrecipesofindia.com": { name: "Dassana's Veg Recipes", tier: "trusted", region: "in", specialty: ["eggless"] },
  "indianhealthyrecipes.com": { name: "Swasthi's Recipes", tier: "trusted", region: "in" },
  "hebbarskitchen.com": { name: "Hebbars Kitchen", tier: "established", region: "in", specialty: ["eggless"] },
  "archanaskitchen.com": { name: "Archana's Kitchen", tier: "established", region: "in" },
  "manjulaskitchen.com": { name: "Manjula's Kitchen", tier: "established", region: "in", specialty: ["eggless"] },
  "egglesscooking.com": { name: "Eggless Cooking", tier: "established", specialty: ["eggless"] },
  "mygingergarlickitchen.com": { name: "My Ginger Garlic Kitchen", tier: "established", region: "in" },
  "cookingcarnival.com": { name: "Cooking Carnival", tier: "established", region: "in" },
  "spiceupthecurry.com": { name: "Spice Up The Curry", tier: "established", region: "in" },
  "bakewithshivesh.com": { name: "Bake with Shivesh", tier: "established", region: "in", specialty: ["eggless"] },
  "sanjeevkapoor.com": { name: "Sanjeev Kapoor", tier: "established", region: "in" },

  // Singapore / Malaysia / wider Asia
  "noobcook.com": { name: "Noob Cook", tier: "established", region: "asia" },
  "rotinrice.com": { name: "Roti n Rice", tier: "established", region: "asia" },
  "huangkitchen.com": { name: "Huang Kitchen", tier: "established", region: "asia" },
  "mykitchen101en.com": { name: "MyKitchen101en", tier: "established", region: "asia" },
  "bakeforhappykids.com": { name: "Bake for Happy Kids", tier: "established", region: "asia" },
  "christinesrecipes.com": { name: "Christine's Recipes", tier: "established", region: "asia" },
  "justonecookbook.com": { name: "Just One Cookbook", tier: "trusted", region: "asia" },
  "thelittleepicurean.com": { name: "The Little Epicurean", tier: "established", region: "asia" },
  "siftandsimmer.com": { name: "Sift & Simmer", tier: "established", region: "asia" },
  "woonheng.com": { name: "WoonHeng", tier: "established", region: "asia", specialty: ["vegan"] },
  "cookingwithdog.com": { name: "Cooking with Dog", tier: "established", region: "asia" },

  // Vegan / gluten-free specialists
  "minimalistbaker.com": { name: "Minimalist Baker", tier: "trusted", specialty: ["vegan", "gluten_free"] },
  "lovingitvegan.com": { name: "Loving It Vegan", tier: "established", specialty: ["vegan"] },
  "rainbownourishments.com": { name: "Rainbow Nourishments", tier: "established", specialty: ["vegan"] },
  "thebananadiaries.com": { name: "The Banana Diaries", tier: "established", specialty: ["vegan", "gluten_free"] },
  "noracooks.com": { name: "Nora Cooks", tier: "established", specialty: ["vegan"] },
  "theloopywhisk.com": { name: "The Loopy Whisk", tier: "trusted", specialty: ["gluten_free"] },
  "glutenfreeonashoestring.com": { name: "Gluten Free on a Shoestring", tier: "established", specialty: ["gluten_free"] },
  "letthebakingbegin.com": { name: "Let the Baking Begin", tier: "established" },
};

/** Never used as recipe sources: social, video, aggregators, marketplaces, Q&A. */
const BLOCKED = [
  "pinterest.",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "quora.com",
  "amazon.",
  "ebay.",
  "yummly.com",
  "bigoven.com",
  "wikipedia.org",
  "wikihow.com",
  "scribd.com",
  "medium.com",
  "flipboard.com",
  "msn.com",
  "yahoo.com",
  "tripadvisor.",
];

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  } catch {
    return "";
  }
}

export function lookupSource(domain: string): SourceInfo | undefined {
  if (KNOWN_SOURCES[domain]) return KNOWN_SOURCES[domain];
  // subdomains, e.g. "food.ndtv.com" style or "cooking.nytimes.com"
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join(".");
    if (KNOWN_SOURCES[parent]) return KNOWN_SOURCES[parent];
  }
  return undefined;
}

export function tierOf(domain: string): Tier {
  return lookupSource(domain)?.tier ?? "unknown";
}

export function isBlockedDomain(domain: string): boolean {
  return BLOCKED.some((b) => (b.endsWith(".") ? domain.startsWith(b) || domain.includes(`.${b}`) : domain === b || domain.endsWith(`.${b}`)));
}

/** Domains to emphasise in "site:" focused queries, picked to fit the request. */
export function focusDomains(opts: {
  countryCode?: string | null;
  eggless?: boolean | null;
  vegan?: boolean | null;
  glutenFree?: boolean | null;
}): { global: string[]; regional: string[]; specialty: string[] } {
  const entries = Object.entries(KNOWN_SOURCES);
  const global = entries
    .filter(([, s]) => s.tier === "trusted" && (!s.region || s.region === "global" || s.region === "uk"))
    .map(([d]) => d)
    .filter((d) => !["cooking.nytimes.com", "americastestkitchen.com", "bbc.co.uk"].includes(d)) // paywalled / no markup
    .slice(0, 10);

  const cc = opts.countryCode ?? "";
  const regionKey = cc === "in" ? "in" : ["sg", "my", "id", "th", "ph", "hk", "tw", "jp", "kr", "cn", "vn"].includes(cc) ? "asia" : null;
  const regional = regionKey ? entries.filter(([, s]) => s.region === regionKey).map(([d]) => d) : [];

  const wanted = new Set<string>();
  if (opts.eggless || opts.vegan) wanted.add("eggless");
  if (opts.vegan) wanted.add("vegan");
  if (opts.glutenFree) wanted.add("gluten_free");
  const specialty = entries
    .filter(([, s]) => s.specialty?.some((x) => wanted.has(x)))
    .map(([d]) => d);

  return { global, regional, specialty };
}
