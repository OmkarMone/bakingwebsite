import type { CakeRequirements, ExtractedRecipe, RequirementCheck, ScoreBreakdown, ScoredRecipe } from "@/lib/types";
import { classifyIngredients } from "@/lib/dietary";
import { tierOf } from "./sources";

/**
 * Transparent, deterministic recipe scoring (0–100).
 *
 *   Source reliability     20   reputation tier, author present
 *   User rating            12   Bayesian-adjusted toward 4.0 for low review counts
 *   Review volume          10   log-scaled
 *   Recipe detail          10   ingredient/step completeness, times, yield
 *   Ingredient quality      8   metric weights, specificity
 *   Technique quality      10   preheat, pan prep, doneness test, mixing guidance, cooling…
 *   Relevance              25   matches the user's hard + soft requirements
 *   Evidence of success     5   strong rating backed by many reviews
 */

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

const CAKE_WORDS = /\b(cake|cupcakes?|torte|gateau|gâteau|sponge|cheesecake|bundt|loaf cake|layer cake|chiffon|genoise|tres leches|pound cake)\b/i;

export function isCakeRecipe(r: ExtractedRecipe, requestedType: string): boolean {
  const hay = `${r.title} ${r.keywords.join(" ")} ${r.category ?? ""}`.toLowerCase();
  if (CAKE_WORDS.test(hay)) return true;
  const main = requestedType.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  return main.length > 0 && main.every((w) => hay.includes(w));
}

/** Basic sanity: enough data to be a usable recipe. */
export function validateExtracted(r: ExtractedRecipe, requestedType: string): string | null {
  if (r.ingredients.length < 4) return "Too few ingredients listed";
  if (r.instructions.filter((s) => !s.startsWith("—")).length < 2) return "Instructions missing or incomplete";
  if (!isCakeRecipe(r, requestedType)) return "Not a cake recipe";
  return null;
}

const METRIC = /\b\d+(?:[.,]\d+)?\s?(g|gm|gms|grams?|kg|ml|millilit(?:er|re)s?|l)\b/i;
const SPECIFIC = /\b(room temperature|softened|melted|sifted|natural|dutch|unsweetened|cake flour|all[- ]purpose|caster|superfine|full[- ]fat|whole milk|unsalted|large|chopped|freshly|hot|boiling|brewed)\b/i;

const TECHNIQUE_SIGNALS: [RegExp, string][] = [
  [/preheat|heat (the )?oven/i, "preheat"],
  [/\d{3}\s?°|\d{3}\s?(c|f)\b|degrees|gas mark/i, "temperature"],
  [/grease|line|parchment|butter (the )?(tin|pan)|flour (the )?pan/i, "pan prep"],
  [/sift|whisk (together )?the (dry|flour)/i, "dry mixing"],
  [/room temperature|softened/i, "temperature of ingredients"],
  [/just (combined|incorporated)|do not over ?mix|don'?t over ?mix|until no (streaks|flour)/i, "mixing guidance"],
  [/toothpick|skewer|cake tester|springs back|comes out clean|internal temperature/i, "doneness test"],
  [/cool (completely|in the pan|for \d+)|wire rack/i, "cooling"],
  [/fold/i, "folding"],
  [/(rest|sit) for \d+|bloom/i, "resting/blooming"],
];

const SOFT_KEYWORDS = (r: CakeRequirements) => {
  const out: { label: string; re: RegExp; weight: number }[] = [];
  if (r.texture) {
    const words = r.texture.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !["very", "and", "with"].includes(w));
    if (words.length) out.push({ label: `Texture: ${r.texture}`, re: new RegExp(`\\b(${words.join("|")})`, "i"), weight: 2 });
  }
  if (r.frosting) {
    const f = r.frosting.toLowerCase();
    const key = /ganache/.test(f) ? "ganache" : /buttercream/.test(f) ? "buttercream" : /cream cheese/.test(f) ? "cream cheese" : /whipped/.test(f) ? "whipped" : f.split(/\s+/).pop()!;
    out.push({ label: `Frosting: ${r.frosting}`, re: new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), weight: 1.5 });
  }
  if (r.appliance && r.appliance !== "oven") {
    const map: Record<string, RegExp> = {
      otg: /\botg\b|toaster oven|convection/i,
      air_fryer: /air ?fryer/i,
      microwave: /microwave/i,
      pressure_cooker: /pressure cooker|cooker|kadai|without oven|no[- ]oven|stovetop/i,
    };
    out.push({ label: `Appliance: ${r.appliance.replace("_", " ")}`, re: map[r.appliance], weight: 3 });
  }
  return out;
};

export function scoreRecipe(r: ExtractedRecipe, req: CakeRequirements): ScoredRecipe {
  const tier = tierOf(r.domain);
  const flagsRaw = classifyIngredients(r.ingredients);
  const flags = {
    containsEgg: flagsRaw.egg.length > 0,
    containsDairy: flagsRaw.dairy.length > 0,
    containsGluten: flagsRaw.gluten.length > 0,
    containsAnimal: flagsRaw.egg.length + flagsRaw.dairy.length + flagsRaw.otherAnimal.length > 0,
    usesMetric: r.ingredients.filter((i) => METRIC.test(i)).length >= Math.ceil(r.ingredients.length * 0.5),
  };
  const notes: string[] = [];
  const steps = r.instructions.filter((s) => !s.startsWith("—"));
  const textAll = `${r.title} ${r.description ?? ""} ${r.keywords.join(" ")} ${steps.join(" ")} ${r.ingredients.join(" ")}`;

  // Source reliability (20)
  let sourceReliability = tier === "trusted" ? 20 : tier === "established" ? 14 : 7;
  if (!r.author) sourceReliability -= 3;
  if (!r.author && tier === "unknown") notes.push("Unknown site with no named author");

  // Rating (12) — Bayesian shrinkage: few reviews ≈ prior of 4.0
  let userRating = 4;
  if (r.rating != null) {
    const n = r.reviewCount ?? 0;
    const adjusted = (r.rating * n + 4.0 * 10) / (n + 10);
    userRating = clamp((adjusted - 3.5) / 1.5) * 12;
  } else notes.push("No published rating");

  // Review volume (10)
  const reviewVolume = r.reviewCount ? clamp(Math.log10(r.reviewCount + 1) / Math.log10(2001)) * 10 : 0;

  // Detail (10)
  let recipeDetail = 0;
  if (r.ingredients.length >= 6) recipeDetail += 3;
  else if (r.ingredients.length >= 4) recipeDetail += 1.5;
  if (steps.length >= 5) recipeDetail += 3;
  else if (steps.length >= 3) recipeDetail += 1.5;
  if (r.prepMinutes || r.cookMinutes || r.totalMinutes) recipeDetail += 1.5;
  if (r.recipeYield) recipeDetail += 1;
  if (r.description) recipeDetail += 0.5;
  if (steps.length && steps.join(" ").length / steps.length > 70) recipeDetail += 1;
  recipeDetail = Math.min(10, recipeDetail);

  // Ingredient quality (8)
  const metricShare = r.ingredients.length ? r.ingredients.filter((i) => METRIC.test(i)).length / r.ingredients.length : 0;
  const specificShare = r.ingredients.length ? r.ingredients.filter((i) => SPECIFIC.test(i)).length / r.ingredients.length : 0;
  const ingredientQuality = Math.min(8, metricShare * 5 + Math.min(3, specificShare * 6));
  if (metricShare < 0.3) notes.push("Volume (cup) measurements only");

  // Technique (10)
  const hits = TECHNIQUE_SIGNALS.filter(([re]) => re.test(steps.join(" ")));
  const techniqueQuality = Math.min(10, hits.length * 1.25);

  // Relevance (25) — hard dietary constraints dominate
  const checks: RequirementCheck[] = [];
  let earned = 0;
  let possible = 0;
  const add = (requirement: string, weight: number, status: RequirementCheck["status"], note?: string) => {
    possible += weight;
    if (status === "met") earned += weight;
    else if (status === "adaptable") earned += weight * 0.35;
    checks.push({ requirement, status, note });
  };

  const typeWords = `${req.flavor ?? ""} ${req.cakeType}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !["cake", "the", "and", "with", "eggless", "vegan"].includes(w));
  const titleHay = `${r.title} ${r.keywords.join(" ")}`.toLowerCase();
  const typeMatched = typeWords.filter((w) => titleHay.includes(w)).length;
  add(
    `Cake type: ${req.flavor ? `${req.flavor} ` : ""}${req.cakeType}`,
    6,
    !typeWords.length || typeMatched === typeWords.length ? "met" : typeMatched > 0 ? "adaptable" : "not_met",
  );

  let hardFail = false;
  if (req.eggless || req.vegan) {
    const ok = !flags.containsEgg;
    if (!ok) hardFail = true;
    add("Eggless", 8, ok ? "met" : "not_met", ok ? undefined : flagsRaw.egg[0]);
  }
  if (req.vegan) {
    const ok = !flags.containsAnimal;
    if (!ok) hardFail = true;
    add("Vegan", 8, ok ? "met" : "not_met", ok ? undefined : [...flagsRaw.dairy, ...flagsRaw.otherAnimal][0]);
  } else if (req.dairyFree) {
    const ok = !flags.containsDairy;
    if (!ok) hardFail = true;
    add("Dairy-free", 6, ok ? "met" : "not_met", ok ? undefined : flagsRaw.dairy[0]);
  }
  if (req.glutenFree) {
    const ok = !flags.containsGluten;
    if (!ok) hardFail = true;
    add("Gluten-free", 8, ok ? "met" : "not_met", ok ? undefined : flagsRaw.gluten[0]);
  }
  for (const s of SOFT_KEYWORDS(req)) add(s.label, s.weight, s.re.test(textAll) ? "met" : "adaptable");

  const relevancePct = possible ? Math.round((earned / possible) * 100) : 100;
  let relevance = (earned / Math.max(possible, 1)) * 25;
  if (hardFail) {
    relevance = Math.min(relevance, 6);
    notes.push("Does not meet a dietary requirement — usable only as a technique reference");
  }

  // Evidence (5)
  const n = r.reviewCount ?? 0;
  const evidence = r.rating != null ? (r.rating >= 4.5 && n >= 50 ? 5 : r.rating >= 4.3 && n >= 10 ? 3 : 1) : 0;

  const breakdown: ScoreBreakdown = {
    sourceReliability: round1(sourceReliability),
    userRating: round1(userRating),
    reviewVolume: round1(reviewVolume),
    recipeDetail: round1(recipeDetail),
    ingredientQuality: round1(ingredientQuality),
    techniqueQuality: round1(techniqueQuality),
    relevance: round1(relevance),
    evidence,
  };
  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));

  return {
    ...r,
    score,
    breakdown,
    relevancePct,
    checks,
    flags,
    reliabilityTier: tier,
    notes,
    role: hardFail ? "technique_reference" : undefined,
  };
}

/** Normalise a URL for duplicate detection. */
export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    u.hostname = u.hostname.replace(/^(www|m|amp)\./, "");
    u.pathname = u.pathname.replace(/\/amp\/?$/, "/").replace(/\/+$/, "") || "/";
    return `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {
    return url;
  }
}

/** Content fingerprint to catch scraped copies of the same recipe on different sites. */
export function recipeFingerprint(r: ExtractedRecipe): string {
  return r.ingredients
    .map((i) => i.toLowerCase().replace(/[^a-z]/g, ""))
    .sort()
    .join("|")
    .slice(0, 400);
}

/**
 * Choose recipes for synthesis: those that meet hard requirements first (up to 5),
 * plus up to 2 high-quality technique references.
 */
export function selectCandidates(scored: ScoredRecipe[], max = 6): ScoredRecipe[] {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const matching = sorted.filter((s) => s.role !== "technique_reference");
  const reference = sorted.filter((s) => s.role === "technique_reference" && s.score >= 45);
  const picked = matching.slice(0, Math.min(5, max));
  for (const r of reference) {
    if (picked.length >= max) break;
    if (picked.filter((p) => p.role === "technique_reference").length >= 2) break;
    picked.push(r);
  }
  return picked;
}
