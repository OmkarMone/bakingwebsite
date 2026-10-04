import { describe, expect, it } from "vitest";
import { CAKES, FROSTINGS } from "../index";
import { dietViolations } from "@/lib/dietary";
import { FROSTING_TYPES } from "@/lib/calc/frostingCalculator";

/**
 * Quality gate for the curated library. Every entry must pass before it ships.
 */

const names = (ings: { name: string; notes: string | null }[]) => ings.map((i) => `${i.name}${i.notes ? ` (${i.notes})` : ""}`);
const grams = (ings: { grams: number | null; ml: number | null }[]) => ings.reduce((s, i) => s + (i.grams ?? i.ml ?? 0), 0);
const ACID = /yog(h)?urt|curd|buttermilk|vinegar|lemon|lime|sour cream|cocoa|brown sugar|honey|molasses|coffee|espresso|cream of tartar|chocolate|kefir|condensed|banana|pineapple|orange|applesauce|treacle|golden syrup/i;

describe("library integrity", () => {
  it("has unique ids", () => {
    const ids = [...CAKES.map((c) => c.id), ...FROSTINGS.map((f) => f.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("frosting references resolve", () => {
    const ids = new Set(FROSTINGS.map((f) => f.id));
    for (const c of CAKES) {
      if (c.defaultFrostingId) expect(ids, `${c.id} default frosting`).toContain(c.defaultFrostingId);
      for (const f of c.compatibleFrostingIds) expect(ids, `${c.id} compatible frosting ${f}`).toContain(f);
    }
  });
});

describe.each(CAKES.map((c) => [c.id, c] as const))("cake %s", (_id, c) => {
  it("declares diet flags that match its ingredients", () => {
    expect(dietViolations(names(c.ingredients), c.diet), "diet flags vs ingredients").toEqual([]);
    if (c.diet.vegan) expect(c.diet.eggless && c.diet.dairyFree).toBe(true);
  });

  it("has complete, plausible quantities", () => {
    expect(c.ingredients.length).toBeGreaterThanOrEqual(5);
    for (const i of c.ingredients) {
      expect(i.grams != null || i.ml != null, `${i.name} needs grams or ml`).toBe(true);
      if (i.grams != null) expect(i.grams).toBeGreaterThan(0);
      expect(i.shoppingName.length).toBeGreaterThan(1);
    }
    const total = grams(c.ingredients);
    // baked weight ≈ 80–98% of raw ingredient mass (moisture loss)
    expect(c.base.bakedWeightGrams / total, `bakedWeight ${c.base.bakedWeightGrams} vs ingredients ${Math.round(total)} g`).toBeGreaterThan(0.75);
    expect(c.base.bakedWeightGrams / total).toBeLessThan(1.0);
  });

  it("has sane baking parameters", () => {
    expect(c.base.ovenTempC).toBeGreaterThanOrEqual(140);
    expect(c.base.ovenTempC).toBeLessThanOrEqual(200);
    expect(c.base.bakeMinutesMin).toBeLessThanOrEqual(c.base.bakeMinutesMax);
    expect(c.base.bakeMinutesMin).toBeGreaterThanOrEqual(12);
    expect(c.base.bakeMinutesMax).toBeLessThanOrEqual(110);
    expect(c.method.length).toBeGreaterThanOrEqual(6);
  });

  it("balances its leavening", () => {
    const soda = c.ingredients.filter((i) => /baking soda|bicarbonate/i.test(i.name));
    if (soda.length) expect(c.ingredients.some((i) => ACID.test(i.name)), "baking soda needs an acid").toBe(true);
    const flour = c.ingredients.filter((i) => /flour|maida|meal/i.test(i.name) && !/corn ?flour|cornstarch/i.test(i.name)).reduce((s, i) => s + (i.grams ?? 0), 0);
    if (flour > 0) {
      const sodaG = soda.reduce((s, i) => s + (i.grams ?? 0), 0);
      const powderG = c.ingredients.filter((i) => /baking powder/i.test(i.name)).reduce((s, i) => s + (i.grams ?? 0), 0);
      expect(sodaG / flour, "soda ≤ 2.5% of flour").toBeLessThanOrEqual(0.025);
      expect(powderG / flour, "powder ≤ 6% of flour").toBeLessThanOrEqual(0.06);
    }
  });

  it("cites at least two verified references", () => {
    expect(c.references.length).toBeGreaterThanOrEqual(2);
    for (const r of c.references) {
      expect(r.url).toMatch(/^https:\/\//);
      expect(r.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(r.whatWeTook.length).toBeGreaterThan(10);
    }
  });
});

describe.each(FROSTINGS.map((f) => [f.id, f] as const))("frosting %s", (_id, f) => {
  it("is consistent", () => {
    expect(FROSTING_TYPES).toContain(f.type);
    expect(dietViolations(names(f.ingredients), f.diet)).toEqual([]);
    expect(Math.abs(grams(f.ingredients) - f.batchGrams) / f.batchGrams, "batchGrams ≈ sum of ingredients").toBeLessThan(0.08);
    expect(f.method.length).toBeGreaterThanOrEqual(3);
    expect(f.references.length).toBeGreaterThanOrEqual(1);
  });
});
