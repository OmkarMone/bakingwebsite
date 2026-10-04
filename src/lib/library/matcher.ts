import type { CakeRequirements } from "@/lib/types";
import type { CuratedCake, CuratedFrosting, Diet } from "./types";
import { CAKES, FROSTINGS } from "./index";

/**
 * Deterministic matching of requirements → curated library. No AI.
 *
 *   Cake type / flavour   60   every meaningful word of the request found in the cake's tags/name
 *   Texture               15
 *   Appliance support     15   recipe has guidance for the requested appliance
 *   Frosting pairing      10   requested frosting is a listed pairing
 *
 * Dietary requirements are hard filters — a cake that doesn't meet them is never returned as a match.
 */

const STOP = new Set([
  "cake", "cakes", "the", "a", "an", "and", "with", "for", "of", "recipe", "style", "classic", "easy", "best", "simple",
  "homemade", "moist", "soft", "eggless", "vegan", "egg", "free", "gluten", "dairy", "layer", "birthday", "kg", "g",
]);

const SYNONYMS: Record<string, string> = {
  choco: "chocolate", chocolatey: "chocolate", cocoa: "chocolate", vanila: "vanilla", carrots: "carrot",
  bananas: "banana", lemons: "lemon", espresso: "coffee", pineapples: "pineapple", strawberries: "strawberry",
  greentea: "matcha", screwpine: "pandan", oranges: "orange", coconuts: "coconut",
};

export const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/red[\s-]?velvet/g, "redvelvet")
    .replace(/black[\s-]?forest/g, "blackforest")
    .replace(/tres[\s-]?leches/g, "tresleches")
    .replace(/green[\s-]?tea/g, "matcha")
    .split(/[^a-z]+/)
    .map((w) => SYNONYMS[w] ?? w)
    .filter((w) => w.length > 2 && !STOP.has(w));

const cakeVocabulary = (c: CuratedCake) => new Set(tokens([c.name, c.cakeType, ...c.tags].join(" ")));

export function satisfiesDiet(diet: Diet, req: Pick<CakeRequirements, "eggless" | "vegan" | "glutenFree" | "dairyFree">): string[] {
  const missing: string[] = [];
  if ((req.eggless || req.vegan) && !diet.eggless) missing.push("eggless");
  if (req.vegan && !diet.vegan) missing.push("vegan");
  if ((req.dairyFree || req.vegan) && !diet.dairyFree) missing.push("dairy-free");
  if (req.glutenFree && !diet.glutenFree) missing.push("gluten-free");
  return missing;
}

export interface CakeMatch {
  cake: CuratedCake;
  score: number; // 0–100
  typeMatch: number; // 0–1
  dietOk: boolean;
  missingDiet: string[];
  reasons: string[];
}

export function matchCakes(req: CakeRequirements): CakeMatch[] {
  const wanted = [...new Set(tokens(`${req.flavor ?? ""} ${req.cakeType}`))];
  const textureWords = req.texture ? tokens(req.texture).concat(req.texture.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3)) : [];

  return CAKES.map((cake) => {
    const vocab = cakeVocabulary(cake);
    const reasons: string[] = [];
    const hits = wanted.filter((w) => vocab.has(w));
    // Generic request ("cake") → prefer versatile vanilla/chocolate classics a little
    const typeMatch = wanted.length ? hits.length / wanted.length : vocab.has("vanilla") || vocab.has("chocolate") ? 0.6 : 0.4;
    let score = typeMatch * 60;
    if (hits.length) reasons.push(`Matches “${hits.join(", ")}”`);

    if (textureWords.length) {
      const t = textureWords.filter((w) => cake.textureTags.some((tt) => tt.includes(w)));
      score += (t.length ? 1 : 0.3) * 15;
      if (t.length) reasons.push(`Texture: ${cake.textureTags.slice(0, 3).join(", ")}`);
    } else score += 10;

    const appliance = req.appliance ?? "oven";
    if (cake.applianceNotes[appliance] || appliance === "oven") score += 15;
    else reasons.push(`No tested guidance for ${appliance.replace("_", " ")}`);

    if (req.frosting) {
      const f = findFrostingForText(req.frosting, req);
      if (f && (cake.defaultFrostingId === f.id || cake.compatibleFrostingIds.includes(f.id))) {
        score += 10;
        reasons.push(`Pairs with ${f.name}`);
      } else score += 4;
    } else score += 8;

    const missingDiet = satisfiesDiet(cake.diet, req);
    return { cake, score: Math.round(score), typeMatch, dietOk: missingDiet.length === 0, missingDiet, reasons };
  }).sort((a, b) => Number(b.dietOk) - Number(a.dietOk) || b.score - a.score);
}

/** A match good enough to answer from the library without searching the web. */
export const isStrongMatch = (m: CakeMatch | undefined) => !!m && m.dietOk && m.typeMatch >= 0.99;

const FROSTING_HINTS: [RegExp, string[]][] = [
  [/white chocolate ganache/, ["white-chocolate-ganache"]],
  [/ganache|chocolate glaze/, ["dark-chocolate-ganache", "vegan-chocolate-ganache"]],
  [/swiss/, ["swiss-meringue-buttercream"]],
  [/italian/, ["italian-meringue-buttercream"]],
  [/cream cheese/, ["cream-cheese-frosting"]],
  [/whipped|fresh cream|whipping/, ["stabilised-whipped-cream"]],
  [/chocolate (frosting|buttercream|icing)/, ["chocolate-buttercream"]],
  [/buttercream|butter cream|frosting|icing/, ["american-buttercream", "vegan-buttercream"]],
];

/** Map free-text frosting to a curated frosting that also satisfies the diet. */
export function findFrostingForText(text: string, req: Pick<CakeRequirements, "eggless" | "vegan" | "glutenFree" | "dairyFree">): CuratedFrosting | null {
  const t = text.toLowerCase();
  if (/no frosting|unfrosted|naked|without frosting|plain/.test(t)) return null;
  const ids = FROSTING_HINTS.find(([re]) => re.test(t))?.[1] ?? [];
  const candidates = ids.map((id) => FROSTINGS.find((f) => f.id === id)).filter((f): f is CuratedFrosting => !!f);
  return candidates.find((f) => satisfiesDiet(f.diet, req).length === 0) ?? null;
}

export function wantsNoFrosting(text: string | null | undefined) {
  return !!text && /no frosting|unfrosted|naked|without frosting|plain/.test(text.toLowerCase());
}
