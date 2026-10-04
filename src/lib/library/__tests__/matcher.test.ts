import { describe, expect, it } from "vitest";
import { RequirementsSchema, type CakeRequirementsInput } from "@/lib/types";
import { heuristicParse } from "@/lib/requirementParser";
import { CAKES } from "../index";
import { isStrongMatch, matchCakes } from "../matcher";
import { assembleRecipe } from "../assemble";
import { validateFinalRecipe } from "@/lib/research/recipeValidator";
import { dietViolations } from "@/lib/dietary";

const req = (input: Partial<CakeRequirementsInput>) => RequirementsSchema.parse({ cakeType: "Cake", ...input });
const fromText = (q: string) => RequirementsSchema.parse(heuristicParse(q));

describe("matching", () => {
  it.each([
    ["I want to make a 1 kg eggless chocolate cake for a birthday", "eggless-chocolate-cake"],
    ["vegan chocolate cake", "vegan-chocolate-cake"],
    ["red velvet cake with cream cheese frosting", "red-velvet-cake"],
    ["eggless red velvet cake", "eggless-red-velvet-cake"],
    ["black forest cake", "black-forest-cake"],
    ["chocolate cake", "classic-chocolate-cake"],
    ["gluten-free chocolate cake", "gluten-free-chocolate-cake"],
  ])("“%s” → %s", (q, expected) => {
    const m = matchCakes(fromText(q));
    expect(m[0].cake.id).toBe(expected);
    expect(isStrongMatch(m[0])).toBe(true);
  });

  it("never returns a cake that violates a hard diet requirement as diet-ok", () => {
    for (const diet of [{ eggless: true }, { vegan: true }, { glutenFree: true }, { dairyFree: true }]) {
      for (const m of matchCakes(req({ cakeType: "Chocolate cake", ...diet })).filter((x) => x.dietOk)) {
        expect(dietViolations(m.cake.ingredients.map((i) => i.name), diet), `${m.cake.id} vs ${JSON.stringify(diet)}`).toEqual([]);
      }
    }
  });

  it("is not a strong match for cakes we don't have", () => {
    expect(isStrongMatch(matchCakes(fromText("durian mille crepe cake"))[0])).toBe(false);
  });
});

describe("assembling every library cake", () => {
  it.each(CAKES.map((c) => [c.id, c] as const))("%s scales to 1 kg and 2 kg and validates", (_id, cake) => {
    for (const weightGrams of [1000, 2000]) {
      const r = req({ cakeType: cake.cakeType, weightGrams, eggless: cake.diet.eggless || null, vegan: cake.diet.vegan || null, glutenFree: cake.diet.glutenFree || null });
      const { recipe, scaleFactor } = assembleRecipe(cake, r);
      const errors = validateFinalRecipe(recipe, r).filter((v) => v.level === "error");
      expect(errors, errors.map((e) => e.message).join("; ")).toEqual([]);
      expect(scaleFactor).toBeGreaterThan(0.2);
      // finished weight lands near the request (frosting sizing is approximate)
      expect(Math.abs(recipe.overview.finishedWeightGrams - weightGrams) / weightGrams).toBeLessThan(0.25);
    }
  });

  it("reduces sugar for 'less sweet'", () => {
    const cake = CAKES.find((c) => c.id === "classic-chocolate-cake")!;
    const base = assembleRecipe(cake, req({ cakeType: "Chocolate cake" })).recipe;
    const less = assembleRecipe(cake, req({ cakeType: "Chocolate cake", sweetness: "less" })).recipe;
    const sugar = (rr: typeof base) => rr.ingredients.filter((i) => i.group === "Cake" && /\bsugar\b/i.test(i.name)).reduce((s, i) => s + (i.grams ?? 0), 0);
    expect(sugar(less)).toBeLessThan(sugar(base) * 0.9);
  });

  it("uses a diet-compatible frosting for vegan cakes", () => {
    const cake = CAKES.find((c) => c.id === "vegan-chocolate-cake")!;
    const r = req({ cakeType: "Chocolate cake", vegan: true, frosting: "Chocolate ganache" });
    const { frosting } = assembleRecipe(cake, r);
    expect(frosting?.diet.vegan).toBe(true);
  });
});
