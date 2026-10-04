import type { RecipeIngredient } from "@/lib/types";
import { roundGrams, roundTempC, cToF, formatTsp } from "./units";

/**
 * Cake calculator — batter quantity, servings, temperature, time and
 * ingredient amounts from baker's-percentage base formulas.
 *
 * Everything here is an APPROXIMATION built from common baking rules of thumb
 * (Wilton-style batter charts, standard serving portions, baker's percentages).
 */

export const CAKE_STYLES = [
  "butter",
  "oil",
  "sponge",
  "chocolate_oil",
  "eggless_chocolate",
  "vanilla_eggless",
] as const;
export type CakeStyle = (typeof CAKE_STYLES)[number];

export const CAKE_STYLE_LABELS: Record<CakeStyle, string> = {
  butter: "Butter cake (creamed)",
  oil: "Oil-based vanilla cake",
  sponge: "Sponge / genoise",
  chocolate_oil: "Chocolate cake (oil)",
  eggless_chocolate: "Eggless chocolate cake",
  vanilla_eggless: "Eggless vanilla cake",
};

interface FormulaItem {
  name: string;
  pct: number; // baker's % (flour = 100)
  role: string;
  shoppingName: string;
  group?: string;
  notes?: string;
  /** grams per teaspoon, for small-quantity household measures */
  gPerTsp?: number;
  /** liquid: also report ml (density ≈ 1) */
  liquid?: boolean;
  /** whole eggs: report egg count */
  egg?: boolean;
}

interface StyleSpec {
  /** Batter density in g/ml */
  density: number;
  /** Multiplier applied to the base bake-time model */
  timeMult: number;
  /** Temperature offset vs the default chart (°C) */
  tempOffset: number;
  formula: FormulaItem[];
}

/*
 * Base formulas (baker's percentages, flour = 100).
 * - butter: classic American creamed yellow/butter cake (≈ 1:1 sugar:flour, butter 50%).
 * - oil: oil-based vanilla/"chiffon-style" layer cake common in American home baking.
 * - sponge: classic French genoise (eggs ≈ 160%, sugar = flour, a little melted butter).
 * - chocolate_oil: one-bowl American chocolate cake with hot liquid (Hershey's-style family).
 * - eggless_chocolate: Indian home-baking eggless chocolate cake (curd/yogurt + baking soda + vinegar).
 * - vanilla_eggless: Indian-style eggless vanilla cake with sweetened condensed milk.
 */
const STYLE_SPECS: Record<CakeStyle, StyleSpec> = {
  butter: {
    density: 0.95,
    timeMult: 1,
    tempOffset: 0,
    formula: [
      { name: "Cake flour (or plain flour)", pct: 100, role: "structure", shoppingName: "cake flour", notes: "sifted" },
      { name: "Caster sugar", pct: 100, role: "sweetness, tenderness", shoppingName: "caster sugar" },
      { name: "Unsalted butter", pct: 50, role: "flavour, tenderness, aeration", shoppingName: "unsalted butter", notes: "softened" },
      { name: "Eggs", pct: 50, role: "structure, emulsifier", shoppingName: "eggs", egg: true, notes: "room temperature" },
      { name: "Milk", pct: 60, role: "moisture", shoppingName: "milk", liquid: true },
      { name: "Baking powder", pct: 3, role: "leavening", shoppingName: "baking powder", gPerTsp: 4 },
      { name: "Fine salt", pct: 1, role: "flavour", shoppingName: "salt", gPerTsp: 6 },
      { name: "Vanilla extract", pct: 1.5, role: "flavour", shoppingName: "vanilla extract", gPerTsp: 4.2, liquid: true },
    ],
  },
  oil: {
    density: 1.0,
    timeMult: 1,
    tempOffset: 0,
    formula: [
      { name: "Plain (all-purpose) flour", pct: 100, role: "structure", shoppingName: "plain flour" },
      { name: "Caster sugar", pct: 100, role: "sweetness, tenderness", shoppingName: "caster sugar" },
      { name: "Neutral oil", pct: 45, role: "moisture, tenderness", shoppingName: "vegetable oil", liquid: true },
      { name: "Eggs", pct: 55, role: "structure, emulsifier", shoppingName: "eggs", egg: true, notes: "room temperature" },
      { name: "Buttermilk (or milk + lemon juice)", pct: 75, role: "moisture, acidity", shoppingName: "buttermilk", liquid: true },
      { name: "Baking powder", pct: 3, role: "leavening", shoppingName: "baking powder", gPerTsp: 4 },
      { name: "Baking soda", pct: 0.5, role: "leavening (reacts with buttermilk)", shoppingName: "baking soda", gPerTsp: 5 },
      { name: "Fine salt", pct: 1, role: "flavour", shoppingName: "salt", gPerTsp: 6 },
      { name: "Vanilla extract", pct: 1.5, role: "flavour", shoppingName: "vanilla extract", gPerTsp: 4.2, liquid: true },
    ],
  },
  sponge: {
    density: 0.5, // whisked-egg batter holds a lot of air
    timeMult: 0.8,
    tempOffset: 5,
    formula: [
      { name: "Eggs", pct: 160, role: "structure, aeration", shoppingName: "eggs", egg: true, notes: "room temperature" },
      { name: "Caster sugar", pct: 100, role: "stabilises foam, sweetness", shoppingName: "caster sugar" },
      { name: "Cake flour", pct: 100, role: "structure", shoppingName: "cake flour", notes: "sifted twice" },
      { name: "Unsalted butter", pct: 24, role: "flavour, moisture", shoppingName: "unsalted butter", notes: "melted and cooled" },
      { name: "Fine salt", pct: 0.5, role: "flavour", shoppingName: "salt", gPerTsp: 6 },
      { name: "Vanilla extract", pct: 1, role: "flavour", shoppingName: "vanilla extract", gPerTsp: 4.2, liquid: true },
    ],
  },
  chocolate_oil: {
    density: 1.0,
    timeMult: 1.05,
    tempOffset: 0,
    formula: [
      { name: "Plain (all-purpose) flour", pct: 100, role: "structure", shoppingName: "plain flour" },
      { name: "Caster sugar", pct: 140, role: "sweetness, moisture", shoppingName: "caster sugar" },
      { name: "Unsweetened cocoa powder", pct: 25, role: "flavour, colour, some structure", shoppingName: "cocoa powder", notes: "sifted" },
      { name: "Eggs", pct: 40, role: "structure, emulsifier", shoppingName: "eggs", egg: true, notes: "room temperature" },
      { name: "Milk", pct: 95, role: "moisture", shoppingName: "milk", liquid: true },
      { name: "Neutral oil", pct: 43, role: "moisture, tenderness", shoppingName: "vegetable oil", liquid: true },
      { name: "Hot water or hot coffee", pct: 95, role: "blooms cocoa, thin batter for a moist crumb", shoppingName: "instant coffee", liquid: true },
      { name: "Baking soda", pct: 3, role: "leavening (reacts with natural cocoa)", shoppingName: "baking soda", gPerTsp: 5 },
      { name: "Baking powder", pct: 2.4, role: "leavening", shoppingName: "baking powder", gPerTsp: 4 },
      { name: "Fine salt", pct: 2, role: "flavour", shoppingName: "salt", gPerTsp: 6 },
      { name: "Vanilla extract", pct: 3, role: "flavour", shoppingName: "vanilla extract", gPerTsp: 4.2, liquid: true },
    ],
  },
  eggless_chocolate: {
    density: 0.98,
    timeMult: 1.05,
    tempOffset: -5,
    formula: [
      { name: "Plain (all-purpose) flour", pct: 100, role: "structure", shoppingName: "plain flour" },
      { name: "Caster sugar", pct: 95, role: "sweetness, moisture", shoppingName: "caster sugar" },
      { name: "Unsweetened cocoa powder", pct: 22, role: "flavour, colour", shoppingName: "cocoa powder", notes: "sifted" },
      { name: "Neutral oil", pct: 45, role: "moisture, tenderness", shoppingName: "vegetable oil", liquid: true },
      { name: "Plain yogurt (curd)", pct: 55, role: "moisture, acidity, replaces egg binding", shoppingName: "plain yogurt", notes: "room temperature, whisked smooth" },
      { name: "Milk", pct: 70, role: "moisture", shoppingName: "milk", liquid: true },
      { name: "White vinegar", pct: 3, role: "acidity for baking soda", shoppingName: "white vinegar", gPerTsp: 5, liquid: true },
      { name: "Baking soda", pct: 1.2, role: "leavening", shoppingName: "baking soda", gPerTsp: 5 },
      { name: "Baking powder", pct: 1.5, role: "leavening", shoppingName: "baking powder", gPerTsp: 4 },
      { name: "Fine salt", pct: 1, role: "flavour", shoppingName: "salt", gPerTsp: 6 },
      { name: "Vanilla extract", pct: 2, role: "flavour", shoppingName: "vanilla extract", gPerTsp: 4.2, liquid: true },
    ],
  },
  vanilla_eggless: {
    density: 0.98,
    timeMult: 1,
    tempOffset: -5,
    formula: [
      { name: "Plain (all-purpose) flour", pct: 100, role: "structure", shoppingName: "plain flour" },
      { name: "Sweetened condensed milk", pct: 60, role: "sweetness, binding, moisture", shoppingName: "condensed milk" },
      { name: "Caster sugar", pct: 40, role: "sweetness", shoppingName: "caster sugar" },
      { name: "Unsalted butter or neutral oil", pct: 40, role: "tenderness, flavour", shoppingName: "unsalted butter", notes: "melted" },
      { name: "Milk", pct: 85, role: "moisture", shoppingName: "milk", liquid: true },
      { name: "White vinegar", pct: 4, role: "acidity for baking soda", shoppingName: "white vinegar", gPerTsp: 5, liquid: true },
      { name: "Baking powder", pct: 2, role: "leavening", shoppingName: "baking powder", gPerTsp: 4 },
      { name: "Baking soda", pct: 0.8, role: "leavening", shoppingName: "baking soda", gPerTsp: 5 },
      { name: "Vanilla extract", pct: 3, role: "flavour", shoppingName: "vanilla extract", gPerTsp: 4.2, liquid: true },
      { name: "Fine salt", pct: 0.8, role: "flavour", shoppingName: "salt", gPerTsp: 6 },
    ],
  },
};

const CUBIC_IN_TO_ML = 16.387;
const BAKE_LOSS = 0.1; // ~10% moisture loss in baking
const AVG_EGG_G = 50;
/** Approximate finished cake weight per serving (cake only, no frosting). */
export const PARTY_SERVING_G = 90; // 1.5 × 2 × 4 in portion
export const WEDDING_SERVING_G = 60; // 1 × 2 × 4 in portion

export interface CakeCalculatorInput {
  desiredWeightG?: number | null;
  panDiameterIn: number;
  panHeightIn: number;
  layers: number;
  desiredServings?: number | null;
  cakeStyle: CakeStyle;
}

export interface PanOption {
  diameterIn: number;
  heightIn: number;
  layers: number;
  label: string;
  fillRatio: number;
}

export interface CakeCalculatorResult {
  approximate: true;
  fillFraction: number;
  batterPerPanG: number;
  batterTotalG: number;
  /** Batter the selected pans can hold (independent of desired weight) */
  panCapacityBatterG: number;
  estimatedFinishedWeightG: number;
  servings: { party: number; wedding: number };
  /** Finished weight needed for desiredServings (party portions) */
  weightForDesiredServingsG: number | null;
  recommendedPans: PanOption[];
  ovenTempC: number;
  ovenTempF: number;
  bakeMinutesMin: number;
  bakeMinutesMax: number;
  batterDepthIn: number;
  ingredients: RecipeIngredient[];
  notes: string[];
}

/** Fraction of pan height to fill: ~2/3 for 2" pans, less for taller pans (batter-chart behaviour). */
export function fillFractionForHeight(heightIn: number): number {
  if (heightIn <= 2) return 2 / 3;
  const depth = 1.3 + 0.4 * (heightIn - 2);
  return Math.min(2 / 3, depth / heightIn);
}

function roundPanAreaSqIn(diameterIn: number) {
  return Math.PI * (diameterIn / 2) ** 2;
}

export function batterPerRoundPanG(diameterIn: number, heightIn: number, style: CakeStyle): number {
  const volIn3 = roundPanAreaSqIn(diameterIn) * heightIn * fillFractionForHeight(heightIn);
  return volIn3 * CUBIC_IN_TO_ML * STYLE_SPECS[style].density;
}

/** Default oven temperature for a pan diameter (°C, conventional oven). */
export function ovenTempForDiameter(diameterIn: number, style: CakeStyle = "butter"): number {
  let t: number;
  if (diameterIn <= 6) t = 180;
  else if (diameterIn <= 8) t = 175;
  else if (diameterIn <= 9) t = 170;
  else if (diameterIn <= 10) t = 165;
  else t = 160;
  return roundTempC(t + STYLE_SPECS[style].tempOffset);
}

/** Bake-time model: mostly batter depth, a little diameter. */
export function estimateBakeMinutes(
  diameterIn: number,
  batterDepthIn: number,
  style: CakeStyle,
): { min: number; max: number } {
  const t = (6 + 20 * batterDepthIn + 1.5 * Math.max(0, diameterIn - 8)) * STYLE_SPECS[style].timeMult;
  return { min: Math.max(10, Math.round(t * 0.9)), max: Math.max(14, Math.round(t * 1.15)) };
}

/** Build ingredient list from a base formula, scaled to a total batter weight. */
export function baseFormulaIngredients(style: CakeStyle, batterGrams: number): RecipeIngredient[] {
  const formula = STYLE_SPECS[style].formula;
  const sumPct = formula.reduce((s, f) => s + f.pct, 0);
  return formula.map((f) => {
    const g = (f.pct / sumPct) * batterGrams;
    let householdMeasure: string | null = null;
    if (f.egg) {
      const count = Math.max(1, Math.round(g / AVG_EGG_G));
      householdMeasure = `${count} large egg${count > 1 ? "s" : ""}`;
    } else if (f.gPerTsp && g / f.gPerTsp <= 12) {
      householdMeasure = formatTsp(g / f.gPerTsp);
    }
    return {
      group: f.group ?? "Cake",
      name: f.name,
      grams: roundGrams(g),
      ml: f.liquid ? roundGrams(g) : null,
      householdMeasure,
      notes: f.notes ?? null,
      role: f.role,
      shoppingName: f.shoppingName,
    };
  });
}

const ROUND_DIAMETERS = [6, 7, 8, 9, 10, 12];
const PAN_HEIGHTS = [2, 3];

/** Suggest pan setups whose capacity matches a target batter weight (±15%). */
export function recommendPans(targetBatterG: number, style: CakeStyle, max = 4): PanOption[] {
  const options: (PanOption & { err: number })[] = [];
  for (const d of ROUND_DIAMETERS) {
    for (const h of PAN_HEIGHTS) {
      for (let layers = 1; layers <= 3; layers++) {
        const cap = batterPerRoundPanG(d, h, style) * layers;
        const fillRatio = targetBatterG / cap;
        if (fillRatio >= 0.85 && fillRatio <= 1.12) {
          options.push({
            diameterIn: d,
            heightIn: h,
            layers,
            fillRatio,
            label: `${layers > 1 ? `${layers} × ` : ""}${d}" round, ${h}" tall`,
            err: Math.abs(1 - fillRatio) + (layers - 1) * 0.04,
          });
        }
      }
    }
  }
  return options
    .sort((a, b) => a.err - b.err)
    .slice(0, max)
    .map((o) => ({ diameterIn: o.diameterIn, heightIn: o.heightIn, layers: o.layers, fillRatio: o.fillRatio, label: o.label }));
}

export function calculateCake(input: CakeCalculatorInput): CakeCalculatorResult {
  const style = input.cakeStyle;
  const diameter = clamp(input.panDiameterIn, 3, 16);
  const height = clamp(input.panHeightIn, 1, 6);
  const layers = Math.round(clamp(input.layers, 1, 6));
  const notes: string[] = [];

  const fill = fillFractionForHeight(height);
  const capacityPerPan = batterPerRoundPanG(diameter, height, style);
  const panCapacity = capacityPerPan * layers;

  let weightForServings: number | null = null;
  if (input.desiredServings && input.desiredServings > 0) {
    weightForServings = roundGrams(input.desiredServings * PARTY_SERVING_G);
  }

  // Target finished weight: explicit weight, else servings, else pan capacity
  const targetFinished =
    input.desiredWeightG && input.desiredWeightG > 0 ? input.desiredWeightG : weightForServings ?? null;

  const batterTotal = targetFinished ? targetFinished / (1 - BAKE_LOSS) : panCapacity;
  const batterPerPan = batterTotal / layers;

  if (targetFinished) {
    const ratio = batterTotal / panCapacity;
    if (ratio > 1.12) {
      notes.push(
        `That much batter would overfill ${layers} × ${diameter}" pan${layers > 1 ? "s" : ""} (~${Math.round(ratio * 100)}% of recommended fill). Use more layers or a larger pan — see suggestions.`,
      );
    } else if (ratio < 0.75) {
      notes.push(
        `This batter only fills the pan to ~${Math.round(ratio * 100)}% of the usual level — layers will be thin; consider a smaller pan.`,
      );
    }
  }

  const density = STYLE_SPECS[style].density;
  const batterDepthIn = batterPerPan / density / CUBIC_IN_TO_ML / roundPanAreaSqIn(diameter);
  const ovenTempC = ovenTempForDiameter(diameter, style);
  const time = estimateBakeMinutes(diameter, batterDepthIn, style);
  const finished = batterTotal * (1 - BAKE_LOSS);

  if (diameter >= 10) {
    notes.push("Pans 10\" and wider bake more evenly with a heating core or flower nail and bake-even strips.");
  }
  if (style === "sponge") {
    notes.push("Sponge batters are mostly air — weight per pan is lower and the batter must be baked immediately.");
  }
  if (style === "eggless_chocolate" || style === "vanilla_eggless") {
    notes.push("Eggless batters rely on baking soda + acid: bake as soon as the wet and dry ingredients are combined.");
  }
  notes.push("Finished weight excludes frosting. Use the frosting calculator for filling and coating amounts.");

  return {
    approximate: true,
    fillFraction: fill,
    batterPerPanG: roundGrams(batterPerPan),
    batterTotalG: roundGrams(batterTotal),
    panCapacityBatterG: roundGrams(panCapacity),
    estimatedFinishedWeightG: roundGrams(finished),
    servings: {
      party: Math.max(1, Math.floor(finished / PARTY_SERVING_G)),
      wedding: Math.max(1, Math.floor(finished / WEDDING_SERVING_G)),
    },
    weightForDesiredServingsG: weightForServings,
    recommendedPans: targetFinished ? recommendPans(batterTotal, style) : [],
    ovenTempC,
    ovenTempF: cToF(ovenTempC),
    bakeMinutesMin: time.min,
    bakeMinutesMax: time.max,
    batterDepthIn: Math.round(batterDepthIn * 100) / 100,
    ingredients: baseFormulaIngredients(style, batterTotal),
    notes,
  };
}

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
