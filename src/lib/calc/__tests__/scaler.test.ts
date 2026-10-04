import { describe, expect, it } from "vitest";
import type { RecipeIngredient } from "@/lib/types";
import {
  PAN_PRESETS,
  bakingAdjustmentAdvice,
  findPan,
  formatVolume,
  panAreaSqIn,
  parseHouseholdMeasure,
  parseLeadingNumber,
  scaleFactorForPan,
  scaleFactorForWeight,
  scaleIngredients,
} from "../recipeScaler";
import { formatFraction, formatTsp, roundGrams } from "../units";

const ing = (over: Partial<RecipeIngredient>): RecipeIngredient => ({
  group: "Cake",
  name: "Thing",
  grams: null,
  ml: null,
  householdMeasure: null,
  notes: null,
  role: "x",
  shoppingName: "thing",
  ...over,
});

describe("units", () => {
  it("rounds grams sensibly", () => {
    expect(roundGrams(183)).toBe(185);
    expect(roundGrams(47.4)).toBe(47);
    expect(roundGrams(3.3)).toBe(3.5);
    expect(roundGrams(0.1)).toBe(0.5);
  });
  it("formats fractions and teaspoons", () => {
    expect(formatFraction(1.25)).toBe("1 ¼");
    expect(formatFraction(0.5)).toBe("½");
    expect(formatTsp(0.75)).toBe("¾ tsp");
    expect(formatTsp(3)).toBe("1 tbsp");
    expect(formatTsp(1.5)).toBe("1 ½ tsp");
  });
});

describe("pans", () => {
  it("computes areas", () => {
    expect(panAreaSqIn(findPan("round-8")!)).toBeCloseTo(50.27, 1);
    expect(panAreaSqIn(findPan("square-8")!)).toBe(64);
    expect(panAreaSqIn(findPan("rect-9x13")!)).toBe(117);
  });
  it("scales between pans by area", () => {
    const f = scaleFactorForPan(findPan("round-8")!, findPan("round-9")!);
    expect(f).toBeCloseTo(81 / 64, 3);
    const g = scaleFactorForPan(findPan("round-8")!, findPan("round-8-tall")!, { matchFill: true });
    expect(g).toBeCloseTo(1.5, 3);
  });
  it("weight factor", () => {
    expect(scaleFactorForWeight(1000, 1500)).toBe(1.5);
    expect(scaleFactorForWeight(0, 1500)).toBe(1);
  });
  it("has presets with unique ids", () => {
    expect(new Set(PAN_PRESETS.map((p) => p.id)).size).toBe(PAN_PRESETS.length);
  });
});

describe("household measure parsing", () => {
  it("parses numbers", () => {
    expect(parseLeadingNumber("1 1/2 tsp")?.[0]).toBe(1.5);
    expect(parseLeadingNumber("1/2 tsp")?.[0]).toBe(0.5);
    expect(parseLeadingNumber("1½ cups")?.[0]).toBe(1.5);
    expect(parseLeadingNumber("¾ cup")?.[0]).toBe(0.75);
    expect(parseLeadingNumber("2.5 tbsp")?.[0]).toBe(2.5);
  });
  it("parses volume combos", () => {
    const m = parseHouseholdMeasure("3/4 cup + 1 tbsp");
    expect(m).toEqual({ kind: "volume", tsp: 36 + 3, usesCups: true, usesTbsp: true });
    expect(parseHouseholdMeasure("1 1/2 tsp")).toMatchObject({ kind: "volume", tsp: 1.5 });
  });
  it("parses counts", () => {
    expect(parseHouseholdMeasure("2 large eggs")).toEqual({ kind: "count", count: 2, noun: "large eggs" });
  });
  it("rejects unparseable", () => {
    expect(parseHouseholdMeasure("a pinch")).toBeNull();
    expect(parseHouseholdMeasure("to taste")).toBeNull();
    expect(parseHouseholdMeasure("")).toBeNull();
  });
  it("formats volumes", () => {
    expect(formatVolume(48, true)).toBe("1 cup");
    expect(formatVolume(36 + 3, true)).toBe("¾ cup + 1 tbsp");
    expect(formatVolume(2.25, false)).toBe("2 ¼ tsp");
  });
});

describe("scaleIngredients", () => {
  it("scales grams, ml and household measures", () => {
    const out = scaleIngredients(
      [
        ing({ name: "Flour", grams: 180, householdMeasure: "1 1/2 cups" }),
        ing({ name: "Milk", grams: 180, ml: 180, householdMeasure: "3/4 cup" }),
        ing({ name: "Baking soda", grams: 3, householdMeasure: "1/2 tsp" }),
      ],
      2,
    );
    expect(out[0].grams).toBe(360);
    expect(out[0].householdMeasure).toBe("3 cups");
    expect(out[1].ml).toBe(360);
    expect(out[1].householdMeasure).toBe("1 ½ cups");
    expect(out[2].grams).toBe(6);
    expect(out[2].householdMeasure).toBe("1 tsp");
  });
  it("nulls out unparseable household measures instead of keeping stale amounts", () => {
    const out = scaleIngredients([ing({ grams: 2, householdMeasure: "a generous pinch" })], 1.5);
    expect(out[0].householdMeasure).toBeNull();
  });
  it("rounds eggs to whole eggs and adds a weight note when needed", () => {
    const [e] = scaleIngredients([ing({ name: "Eggs", grams: 100, householdMeasure: "2 large eggs" })], 1.25);
    expect(e.householdMeasure).toBe("3 large eggs"); // 2.5 → 3 (Math.round)
    expect(e.notes).toMatch(/weigh 125 g/);
    const [e2] = scaleIngredients([ing({ name: "Eggs", grams: 100, householdMeasure: "2 large eggs" })], 2);
    expect(e2.householdMeasure).toBe("4 large eggs");
    expect(e2.notes).toBeNull();
    const [e3] = scaleIngredients([ing({ name: "Egg", grams: 100, householdMeasure: "2 large eggs" })], 0.5);
    expect(e3.householdMeasure).toBe("1 large egg");
  });
  it("does not treat eggless replacers as eggs", () => {
    const [x] = scaleIngredients([ing({ name: "Egg replacer powder", grams: 10, householdMeasure: "1 tbsp" })], 2);
    expect(x.householdMeasure).toBe("2 tbsp");
  });
  it("identity factor returns equal copies", () => {
    const src = [ing({ grams: 183, householdMeasure: "odd" })];
    const out = scaleIngredients(src, 1);
    expect(out[0]).toEqual(src[0]);
    expect(out[0]).not.toBe(src[0]);
  });
});

describe("bakingAdjustmentAdvice", () => {
  it("lowers temp and lengthens time for a bigger, deeper batch", () => {
    const a = bakingAdjustmentAdvice(findPan("round-8"), findPan("round-10"), 2, 35, 40, 175);
    expect(a.tempC).toBeLessThan(175);
    expect(a.bakeMinutesMin).toBeGreaterThan(35);
    expect(a.warnings.some((w) => /heating core/.test(w))).toBe(true);
  });
  it("warns to check early for thinner layers", () => {
    const a = bakingAdjustmentAdvice(findPan("round-8"), findPan("round-9"), 1, 35, 40, 175);
    expect(a.bakeMinutesMin).toBeLessThanOrEqual(35);
  });
  it("keeps time for identical setup", () => {
    const a = bakingAdjustmentAdvice(findPan("round-8"), findPan("round-8"), 1, 35, 40, 175);
    expect(a.bakeMinutesMin).toBe(35);
    expect(a.bakeMinutesMax).toBe(40);
    expect(a.tempC).toBe(175);
  });
});
