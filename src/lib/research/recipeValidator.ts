import type { CakeRequirements, FinalRecipe, ResearchConfidence, ScoredRecipe, ValidationIssue } from "@/lib/types";
import { dietViolations } from "@/lib/dietary";

/**
 * Deterministic checks on the synthesized recipe before it is shown.
 * "error" issues trigger one regeneration attempt; if they persist they are shown prominently.
 */
export function validateFinalRecipe(recipe: FinalRecipe, req: CakeRequirements): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (field: string, message: string) => issues.push({ level: "error", field, message });
  const warn = (field: string, message: string) => issues.push({ level: "warning", field, message });
  const o = recipe.overview;

  // Ingredients & units
  if (recipe.ingredients.length < 5) err("ingredients", "Too few ingredients for a cake recipe.");
  for (const ing of recipe.ingredients) {
    if (ing.grams == null && ing.ml == null && !ing.householdMeasure)
      err("ingredients", `"${ing.name}" has no quantity.`);
    if (ing.grams != null && (ing.grams <= 0 || ing.grams > 5000)) err("ingredients", `"${ing.name}" has an implausible weight (${ing.grams} g).`);
    if (ing.ml != null && (ing.ml <= 0 || ing.ml > 5000)) err("ingredients", `"${ing.name}" has an implausible volume (${ing.ml} ml).`);
  }
  if (recipe.method.length < 5) err("method", "Method has too few steps.");

  // Temperature & time
  const appliance = req.appliance ?? "oven";
  if (appliance !== "microwave" && appliance !== "pressure_cooker") {
    if (o.ovenTempC < 140 || o.ovenTempC > 200) err("ovenTempC", `Oven temperature ${o.ovenTempC}°C is outside the normal cake range (140–200°C).`);
    const expectedF = Math.round((o.ovenTempC * 9) / 5 + 32);
    if (Math.abs(expectedF - o.ovenTempF) > 6) warn("ovenTempF", `°F (${o.ovenTempF}) doesn't match °C (${o.ovenTempC} ≈ ${expectedF}°F).`);
    if (o.bakeMinutesMin < 12 || o.bakeMinutesMax > 120) warn("bake", `Bake time ${o.bakeMinutesMin}–${o.bakeMinutesMax} min looks unusual.`);
  }
  if (o.bakeMinutesMin > o.bakeMinutesMax) err("bake", "Minimum bake time is greater than maximum.");
  if (!o.panSize?.trim()) err("panSize", "No pan size given.");

  // Weight / yield sanity: batter mass vs requested finished weight
  const allGrams = recipe.ingredients.reduce((sum, i) => sum + (i.grams ?? (i.ml != null ? i.ml : 0)), 0);
  if (req.weightGrams) {
    const ratio = allGrams / req.weightGrams;
    if (ratio < 0.8 || ratio > 1.6)
      warn(
        "yield",
        `Total ingredient weight (~${Math.round(allGrams)} g) looks ${ratio < 0.8 ? "low" : "high"} for a ${req.weightGrams} g finished cake — check the yield.`,
      );
    if (Math.abs(o.finishedWeightGrams - req.weightGrams) / req.weightGrams > 0.25)
      warn("yield", `Stated finished weight (${o.finishedWeightGrams} g) differs from the requested ${req.weightGrams} g.`);
  }

  // Dietary restrictions — hard errors
  const names = recipe.ingredients.map((i) => `${i.name}${i.notes ? ` (${i.notes})` : ""}`);
  for (const v of dietViolations(names, req)) err("diet", v);

  // Leavening chemistry
  const find = (re: RegExp) => recipe.ingredients.filter((i) => re.test(i.name.toLowerCase()));
  const soda = find(/baking soda|bicarbonate|bicarb/);
  const powder = find(/baking powder/);
  if (soda.length || powder.length || /self[- ]rais/i.test(names.join(" "))) {
    const acid = find(/yog(h)?urt|curd|buttermilk|vinegar|lemon|lime|sour cream|natural cocoa|unsweetened cocoa|cocoa|brown sugar|honey|molasses|coffee|espresso|cream of tartar|chocolate|kefir|condensed/);
    if (soda.length && !acid.length) err("leavening", "Baking soda is used without an acidic ingredient to activate it.");
  } else if (!/sponge|chiffon|genoise|angel|whisked|meringue/i.test(`${recipe.name} ${o.cakeType}`)) {
    warn("leavening", "No chemical leavener found — make sure this cake style relies on whipped eggs/aquafaba.");
  }
  const flourG = find(/flour|maida/).reduce((s, i) => s + (i.grams ?? 0), 0);
  const sodaG = soda.reduce((s, i) => s + (i.grams ?? 0), 0);
  const powderG = powder.reduce((s, i) => s + (i.grams ?? 0), 0);
  if (flourG > 0 && sodaG / flourG > 0.025) warn("leavening", "Baking soda is unusually high relative to flour — may taste soapy.");
  if (flourG > 0 && powderG / flourG > 0.06) warn("leavening", "Baking powder is unusually high relative to flour — risk of collapse.");

  // Frosting request honoured
  if (req.frosting && !recipe.ingredients.some((i) => !/cake|batter/i.test(i.group)) && !recipe.frostingNotes)
    warn("frosting", `You asked for ${req.frosting}, but the recipe has no frosting component.`);

  return issues;
}

/** % of the user's specified requirements the final recipe satisfies. */
export function requirementsMatched(recipe: FinalRecipe, req: CakeRequirements, issues: ValidationIssue[]): number {
  let total = 1;
  let met = 1; // cake type always counted
  const names = recipe.ingredients.map((i) => i.name);
  const dietReqs: [boolean | null, Parameters<typeof dietViolations>[1]][] = [
    [req.eggless, { eggless: true }],
    [req.vegan, { vegan: true }],
    [req.dairyFree, { dairyFree: true }],
    [req.glutenFree, { glutenFree: true }],
  ];
  for (const [wanted, rule] of dietReqs) {
    if (!wanted) continue;
    total++;
    if (dietViolations(names, rule).length === 0) met++;
  }
  if (req.weightGrams) {
    total++;
    if (Math.abs(recipe.overview.finishedWeightGrams - req.weightGrams) / req.weightGrams <= 0.2) met++;
  }
  if (req.servings) {
    total++;
    if (Math.abs(recipe.overview.servings - req.servings) / req.servings <= 0.3) met++;
  }
  if (req.frosting) {
    total++;
    const key = req.frosting.toLowerCase().split(/\s+/).pop() ?? "";
    if (`${recipe.ingredients.map((i) => i.group).join(" ")} ${recipe.frostingNotes ?? ""} ${recipe.name}`.toLowerCase().includes(key)) met++;
  }
  if (req.appliance && req.appliance !== "oven") {
    total++;
    if (recipe.overview.applianceNotes) met++;
  }
  if (req.texture || req.sweetness) {
    total++;
    met++; // addressed qualitatively by the prompt; not machine-verifiable
  }
  const errors = issues.filter((i) => i.level === "error").length;
  return Math.max(0, Math.round((met / total) * 100) - errors * 5);
}

export function computeConfidence(
  found: number,
  compared: ScoredRecipe[],
  matchedPct: number,
  issues: ValidationIssue[],
): ResearchConfidence {
  const domains = new Set(compared.map((c) => c.domain)).size;
  const matching = compared.filter((c) => c.role !== "technique_reference");
  const withRatings = matching.filter((c) => c.rating != null && (c.reviewCount ?? 0) >= 10).length;
  const errors = issues.filter((i) => i.level === "error").length;

  let level: ResearchConfidence["level"] = "Low";
  if (matching.length >= 4 && domains >= 4 && withRatings >= 2 && matchedPct >= 85 && errors === 0) level = "High";
  else if (matching.length >= 2 && domains >= 2 && matchedPct >= 70 && errors === 0) level = "Medium";

  const parts: string[] = [];
  parts.push(`${matching.length} recipe${matching.length === 1 ? "" : "s"} matched your requirements`);
  if (compared.length > matching.length) parts.push(`${compared.length - matching.length} more used only for technique`);
  if (withRatings) parts.push(`${withRatings} backed by reader ratings`);
  if (matching.length <= 2) parts.push(`only ${matching.length} reasonable source${matching.length === 1 ? " was" : "s were"} found, so treat this as a starting point`);
  if (errors) parts.push(`${errors} validation issue${errors === 1 ? "" : "s"} remain — review the warnings`);

  return {
    level,
    recipesFound: found,
    recipesCompared: compared.length,
    sourcesAnalyzed: domains,
    requirementsMatchedPct: matchedPct,
    explanation: `${parts.join("; ")}.`,
  };
}
