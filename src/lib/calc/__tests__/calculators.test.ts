import { describe, expect, it } from "vitest";
import { CAKE_STYLES, batterPerRoundPanG, calculateCake, baseFormulaIngredients } from "../cakeCalculator";
import { FROSTING_TYPES, calculateFrosting, frostingTypeFromText } from "../frostingCalculator";
import { findSubstitutions, matchSubstitutionEntry, SUBSTITUTIONS } from "@/lib/content/substitutions";
import { TROUBLESHOOTING } from "@/lib/content/troubleshooting";

describe("cake calculator", () => {
  it("8x3 pan holds ~1.0–1.4 kg of butter cake batter", () => {
    const g = batterPerRoundPanG(8, 3, "butter");
    expect(g).toBeGreaterThan(1000);
    expect(g).toBeLessThan(1400);
  });
  it("8x2 pan holds a sensible amount", () => {
    const g = batterPerRoundPanG(8, 2, "butter");
    expect(g).toBeGreaterThan(900);
    expect(g).toBeLessThan(1150);
  });
  it("targets desired weight and suggests pans", () => {
    const r = calculateCake({ desiredWeightG: 1000, panDiameterIn: 8, panHeightIn: 3, layers: 1, cakeStyle: "eggless_chocolate" });
    expect(r.estimatedFinishedWeightG).toBeGreaterThan(950);
    expect(r.estimatedFinishedWeightG).toBeLessThan(1050);
    expect(r.recommendedPans.length).toBeGreaterThan(0);
    const sum = r.ingredients.reduce((s, i) => s + (i.grams ?? 0), 0);
    expect(Math.abs(sum - r.batterTotalG) / r.batterTotalG).toBeLessThan(0.03);
    expect(r.ovenTempC).toBeGreaterThanOrEqual(160);
    expect(r.ovenTempC).toBeLessThanOrEqual(180);
    expect(r.bakeMinutesMin).toBeGreaterThan(20);
    expect(r.bakeMinutesMax).toBeLessThan(80);
    expect(r.approximate).toBe(true);
  });
  it("eggless formulas contain no eggs", () => {
    for (const style of ["eggless_chocolate", "vanilla_eggless"] as const) {
      expect(baseFormulaIngredients(style, 1000).some((i) => /\beggs?\b/i.test(i.name))).toBe(false);
    }
  });
  it("all styles produce positive ingredient lists", () => {
    for (const s of CAKE_STYLES) {
      const r = calculateCake({ panDiameterIn: 8, panHeightIn: 2, layers: 2, cakeStyle: s });
      expect(r.ingredients.every((i) => (i.grams ?? 0) > 0)).toBe(true);
      expect(r.servings.wedding).toBeGreaterThan(r.servings.party);
    }
  });
  it("uses desired servings when no weight given", () => {
    const r = calculateCake({ desiredServings: 20, panDiameterIn: 8, panHeightIn: 3, layers: 2, cakeStyle: "butter" });
    expect(r.weightForDesiredServingsG).toBe(1800);
    expect(r.servings.party).toBeGreaterThanOrEqual(19);
  });
});

describe("frosting calculator", () => {
  it("8-inch 2-layer buttercream cake needs roughly 0.7–1.1 kg", () => {
    const r = calculateFrosting({ type: "buttercream", diameterIn: 8, heightIn: 4, layers: 2, piping: "light" });
    expect(r.grams.total).toBeGreaterThan(700);
    expect(r.grams.total).toBeLessThan(1100);
    const parts = r.grams.filling + r.grams.crumbCoat + r.grams.finalCoat + r.grams.piping + r.grams.waste;
    expect(Math.abs(parts - r.grams.total)).toBeLessThan(15);
    const recipeSum = r.recipe.reduce((s, x) => s + x.grams, 0);
    expect(Math.abs(recipeSum - r.grams.total) / r.grams.total).toBeLessThan(0.03);
  });
  it("single layer has no filling", () => {
    expect(calculateFrosting({ type: "chocolate_ganache", diameterIn: 6, heightIn: 3, layers: 1 }).grams.filling).toBe(0);
  });
  it("whipped cream is lighter than ganache for the same cake", () => {
    const w = calculateFrosting({ type: "whipped_cream", diameterIn: 8, heightIn: 4, layers: 3 });
    const g = calculateFrosting({ type: "chocolate_ganache", diameterIn: 8, heightIn: 4, layers: 3 });
    expect(w.grams.total).toBeLessThan(g.grams.total);
  });
  it("covers every frosting type and maps text", () => {
    for (const t of FROSTING_TYPES) expect(calculateFrosting({ type: t, diameterIn: 8, heightIn: 4, layers: 2 }).recipe.length).toBeGreaterThan(1);
    expect(frostingTypeFromText("Chocolate ganache")).toBe("chocolate_ganache");
    expect(frostingTypeFromText("SMBC")).toBe("swiss_meringue");
    expect(frostingTypeFromText("vanilla buttercream")).toBe("buttercream");
    expect(frostingTypeFromText("fresh cream")).toBe("whipped_cream");
  });
});

describe("substitutions", () => {
  it("has at least 30 entries", () => {
    expect(SUBSTITUTIONS.length).toBeGreaterThanOrEqual(30);
  });
  it("buttermilk is not matched as butter", () => {
    expect(matchSubstitutionEntry("Buttermilk")?.entry.id).toBe("buttermilk");
    expect(matchSubstitutionEntry("Unsalted butter, softened")?.entry.id).toBe("butter");
    expect(matchSubstitutionEntry("Peanut butter")).toBeNull();
  });
  it("distinguishes baking soda and baking powder", () => {
    expect(matchSubstitutionEntry("Baking soda")?.entry.id).toBe("baking-soda");
    expect(matchSubstitutionEntry("Bicarbonate of soda")?.entry.id).toBe("baking-soda");
    expect(matchSubstitutionEntry("Baking powder")?.entry.id).toBe("baking-powder");
  });
  it("matches dutch-process cocoa before cocoa", () => {
    expect(matchSubstitutionEntry("Dutch-process cocoa powder")?.entry.id).toBe("dutch-cocoa");
    expect(matchSubstitutionEntry("Dutch process cocoa")?.entry.id).toBe("dutch-cocoa");
    expect(matchSubstitutionEntry("Unsweetened cocoa powder")?.entry.id).toBe("cocoa");
  });
  it("specific flours win over generic flour", () => {
    expect(matchSubstitutionEntry("Cake flour")?.entry.id).toBe("cake-flour");
    expect(matchSubstitutionEntry("Self-raising flour")?.entry.id).toBe("self-raising-flour");
    expect(matchSubstitutionEntry("All-purpose flour")?.entry.id).toBe("plain-flour");
    expect(matchSubstitutionEntry("Almond flour")?.entry.id).toBe("almond-flour");
  });
  it("egg matching ignores eggless and egg whites go to their own entry", () => {
    expect(matchSubstitutionEntry("Eggs, room temperature")?.entry.id).toBe("egg");
    expect(matchSubstitutionEntry("Egg whites")?.entry.id).toBe("egg-white");
    expect(matchSubstitutionEntry("Egg yolks")).toBeNull();
  });
  it("sugar variants", () => {
    expect(matchSubstitutionEntry("Light brown sugar")?.entry.id).toBe("brown-sugar");
    expect(matchSubstitutionEntry("Icing sugar")?.entry.id).toBe("icing-sugar");
    expect(matchSubstitutionEntry("Sugar")?.entry.id).toBe("granulated-sugar");
  });
  it("scales the recommended instruction", () => {
    const r = findSubstitutions("Buttermilk", { ml: 120 })!;
    expect(r.recommended?.scaledInstruction).toBe("120 ml milk + 1 ½ tsp lemon juice, rest 10 minutes");
  });
  it("respects diet: vegan buttermilk substitute recommended", () => {
    const r = findSubstitutions("Buttermilk", { ml: 240, vegan: true })!;
    expect(r.recommended?.dietOk).toBe(true);
    expect(r.recommended?.instruction).toMatch(/Soy or oat milk/);
    expect(r.substitutes[0].dietOk).toBe(false);
  });
  it("returns null for unknown ingredients", () => {
    expect(findSubstitutions("Edible gold leaf")).toBeNull();
  });
  it("warns when recommended substitute is significant", () => {
    const r = findSubstitutions("Ground almonds", { grams: 100, glutenFree: true })!;
    expect(r.recommended?.impact).not.toBe("significant");
  });
});

describe("troubleshooting", () => {
  it("has unique ids and required problems", () => {
    const ids = TROUBLESHOOTING.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const req of ["sank", "cracked", "dry", "dense", "gummy", "no-rise", "burned-top", "stuck", "frosting-melted", "ganache-runny", "ganache-thick"]) {
      expect(ids).toContain(req);
    }
  });
});
