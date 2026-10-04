import type { RecipeIngredient } from "@/lib/types";
import { roundGrams, roundMl, roundTempC, formatTsp, formatFraction, TSP_PER_TBSP, TBSP_PER_CUP } from "./units";

/* ────────────────────────────────────────────────────────────
 * Pans
 * ──────────────────────────────────────────────────────────── */

export type PanShape = "round" | "square" | "rect";

export interface Pan {
  id: string;
  label: string;
  shape: PanShape;
  /** Round pans */
  diameterIn?: number;
  /** Square / rectangular pans (square uses widthIn for both sides) */
  widthIn?: number;
  lengthIn?: number;
  /** Pan wall height */
  depthIn: number;
}

export const PAN_PRESETS: Pan[] = [
  { id: "round-6", label: '6" round (15 cm)', shape: "round", diameterIn: 6, depthIn: 2 },
  { id: "round-6-tall", label: '6" × 3" tall round', shape: "round", diameterIn: 6, depthIn: 3 },
  { id: "round-7", label: '7" round (18 cm)', shape: "round", diameterIn: 7, depthIn: 2 },
  { id: "round-8", label: '8" round (20 cm)', shape: "round", diameterIn: 8, depthIn: 2 },
  { id: "round-8-tall", label: '8" × 3" tall round', shape: "round", diameterIn: 8, depthIn: 3 },
  { id: "round-9", label: '9" round (23 cm)', shape: "round", diameterIn: 9, depthIn: 2 },
  { id: "round-10", label: '10" round (25 cm)', shape: "round", diameterIn: 10, depthIn: 3 },
  { id: "round-12", label: '12" round (30 cm)', shape: "round", diameterIn: 12, depthIn: 3 },
  { id: "square-8", label: '8" × 8" square', shape: "square", widthIn: 8, depthIn: 2 },
  { id: "square-9", label: '9" × 9" square', shape: "square", widthIn: 9, depthIn: 2 },
  { id: "rect-9x13", label: '9" × 13" rectangle', shape: "rect", widthIn: 9, lengthIn: 13, depthIn: 2 },
  { id: "loaf-9x5", label: '9" × 5" loaf', shape: "rect", widthIn: 5, lengthIn: 9, depthIn: 3 },
];

export function findPan(id: string): Pan | undefined {
  return PAN_PRESETS.find((p) => p.id === id);
}

/** Build a custom round pan. */
export function roundPan(diameterIn: number, depthIn = 2): Pan {
  return { id: `round-custom-${diameterIn}x${depthIn}`, label: `${diameterIn}" round`, shape: "round", diameterIn, depthIn };
}

export function panAreaSqIn(pan: Pan): number {
  switch (pan.shape) {
    case "round": {
      const r = (pan.diameterIn ?? 0) / 2;
      return Math.PI * r * r;
    }
    case "square": {
      const w = pan.widthIn ?? 0;
      return w * w;
    }
    case "rect":
      return (pan.widthIn ?? 0) * (pan.lengthIn ?? pan.widthIn ?? 0);
  }
}

/** Largest horizontal dimension — used for heat-penetration advice. */
export function panSpanIn(pan: Pan): number {
  if (pan.shape === "round") return pan.diameterIn ?? 0;
  if (pan.shape === "square") return pan.widthIn ?? 0;
  // For heat penetration the shorter side matters most in a rectangle
  return Math.min(pan.widthIn ?? 0, pan.lengthIn ?? pan.widthIn ?? 0);
}

export function scaleFactorForWeight(currentG: number, targetG: number): number {
  if (!(currentG > 0) || !(targetG > 0)) return 1;
  return targetG / currentG;
}

/**
 * Batter scale factor to move a recipe between pans. By default this matches
 * batter *depth* (area ratio). Pass `{ matchFill: true }` to also scale for the
 * difference in pan wall height (i.e. fill the new pan to the same fraction).
 */
export function scaleFactorForPan(fromPan: Pan, toPan: Pan, opts: { matchFill?: boolean } = {}): number {
  const a = panAreaSqIn(fromPan);
  const b = panAreaSqIn(toPan);
  if (!(a > 0) || !(b > 0)) return 1;
  let f = b / a;
  if (opts.matchFill && fromPan.depthIn > 0 && toPan.depthIn > 0) f *= toPan.depthIn / fromPan.depthIn;
  return f;
}

/* ────────────────────────────────────────────────────────────
 * Household measure parsing
 * ──────────────────────────────────────────────────────────── */

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

/** Parse "1", "1.5", "1/2", "1 1/2", "1½", "1 ½", "½". Returns [value, rest] or null. */
export function parseLeadingNumber(s: string): [number, string] | null {
  const str = s.trim();
  let m: RegExpMatchArray | null;
  // "1 1/2"
  if ((m = str.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/))) {
    const den = parseInt(m[3], 10);
    if (!den) return null;
    return [parseInt(m[1], 10) + parseInt(m[2], 10) / den, str.slice(m[0].length).trim()];
  }
  // "1/2"
  if ((m = str.match(/^(\d+)\s*\/\s*(\d+)/))) {
    const den = parseInt(m[2], 10);
    if (!den) return null;
    return [parseInt(m[1], 10) / den, str.slice(m[0].length).trim()];
  }
  // "1½", "1 ½", "½"
  if ((m = str.match(/^(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞])/))) {
    return [(m[1] ? parseInt(m[1], 10) : 0) + UNICODE_FRACTIONS[m[2]], str.slice(m[0].length).trim()];
  }
  // "1", "1.5"
  if ((m = str.match(/^(\d+(?:\.\d+)?)/))) {
    return [parseFloat(m[1]), str.slice(m[0].length).trim()];
  }
  return null;
}

type VolumeUnit = "tsp" | "tbsp" | "cup";

const UNIT_PATTERNS: [RegExp, VolumeUnit][] = [
  [/^(tsp|teaspoons?)\b\.?/i, "tsp"],
  [/^(tbsp|tbs|tablespoons?)\b\.?/i, "tbsp"],
  [/^cups?\b\.?/i, "cup"],
];

const TSP_PER: Record<VolumeUnit, number> = { tsp: 1, tbsp: TSP_PER_TBSP, cup: TSP_PER_TBSP * TBSP_PER_CUP };

export type ParsedMeasure =
  | { kind: "volume"; tsp: number; usesCups: boolean; usesTbsp: boolean }
  | { kind: "count"; count: number; noun: string };

/**
 * Parse a household measure such as "1 1/2 tsp", "3/4 cup + 1 tbsp", "2 large eggs".
 * Returns null when the string can't be interpreted reliably.
 */
export function parseHouseholdMeasure(input: string | null | undefined): ParsedMeasure | null {
  if (!input) return null;
  const cleaned = input.replace(/\(.*?\)/g, "").trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/\s*(?:\+|\band\b|,)\s*/i).filter(Boolean);
  let tsp = 0;
  let usesCups = false;
  let usesTbsp = false;
  let volumeParts = 0;

  for (const part of parts) {
    const num = parseLeadingNumber(part);
    if (!num) return null;
    const [value, rest] = num;
    const unit = UNIT_PATTERNS.find(([re]) => re.test(rest));
    if (unit) {
      const u = unit[1];
      // anything after the unit must be trivial (e.g. "level", "heaped")
      const after = rest.replace(unit[0], "").trim();
      if (after && !/^(level|heaped|heaping|scant|packed|of\b.*)$/i.test(after)) return null;
      tsp += value * TSP_PER[u];
      if (u === "cup") usesCups = true;
      if (u === "tbsp") usesTbsp = true;
      volumeParts++;
    } else if (parts.length === 1 && rest && /^[a-z][a-z\s-]*$/i.test(rest)) {
      return { kind: "count", count: value, noun: rest };
    } else {
      return null;
    }
  }
  if (volumeParts === 0) return null;
  return { kind: "volume", tsp, usesCups, usesTbsp };
}

/** Format a volume (in tsp) the way a baker would write it. */
export function formatVolume(tsp: number, preferCups: boolean): string {
  const cupTsp = TSP_PER.cup;
  if (preferCups && tsp >= cupTsp / 4) {
    // Nearest 1/4 cup, remainder in tbsp (nearest 1/2 tbsp)
    const quarterCups = Math.floor(tsp / (cupTsp / 4));
    const remainderTbsp = Math.round(((tsp - quarterCups * (cupTsp / 4)) / TSP_PER_TBSP) * 2) / 2;
    const cups = quarterCups / 4;
    const cupStr = `${formatFraction(cups)} cup${cups > 1 ? "s" : ""}`;
    if (remainderTbsp >= 4) {
      // rounding pushed it to another quarter cup
      return formatVolume((quarterCups + 1) * (cupTsp / 4), true);
    }
    return remainderTbsp > 0 ? `${cupStr} + ${formatFraction(remainderTbsp)} tbsp` : cupStr;
  }
  if (tsp >= TSP_PER_TBSP * 4 && !preferCups) {
    // Large spoon quantities: tbsp to the nearest 1/2
    const tbsp = Math.round((tsp / TSP_PER_TBSP) * 2) / 2;
    return `${formatFraction(tbsp)} tbsp`;
  }
  return formatTsp(tsp);
}

function pluralize(noun: string, count: number): string {
  const n = noun.trim();
  if (count <= 1) return n.replace(/(egg|yolk|white|banana|lemon|orange|lime)s\b/i, "$1");
  if (/s$/i.test(n)) return n;
  return n.replace(/(egg|yolk|white|banana|lemon|orange|lime)\b/i, "$1s");
}

/* ────────────────────────────────────────────────────────────
 * Scaling
 * ──────────────────────────────────────────────────────────── */

const EGG_RE = /\beggs?\b/i;
const NOT_WHOLE_EGG_RE = /eggless|egg[-\s]?free|egg\s*(white|yolk)s?|aquafaba|replacer|eggplant/i;
const AVG_EGG_G = 50; // large egg without shell

function isWholeEgg(name: string): boolean {
  return EGG_RE.test(name) && !NOT_WHOLE_EGG_RE.test(name);
}

function appendNote(existing: string | null, note: string): string {
  return existing ? `${existing}; ${note}` : note;
}

/**
 * Scale ingredients by a factor. Grams/ml are scaled and rounded; household
 * measures are rescaled when parseable and set to null otherwise (never left
 * showing a stale amount). Whole eggs are rounded to whole eggs with a weight
 * note when rounding changes the amount by more than 15%.
 */
export function scaleIngredients(ingredients: RecipeIngredient[], factor: number): RecipeIngredient[] {
  if (!Number.isFinite(factor) || factor <= 0) return ingredients.map((i) => ({ ...i }));
  const identity = Math.abs(factor - 1) < 1e-9;

  return ingredients.map((ing) => {
    if (identity) return { ...ing };
    const out: RecipeIngredient = { ...ing };
    out.grams = ing.grams != null ? roundGrams(ing.grams * factor) : null;
    out.ml = ing.ml != null ? roundMl(ing.ml * factor) : null;

    const parsed = parseHouseholdMeasure(ing.householdMeasure);

    if (isWholeEgg(ing.name)) {
      const baseCount =
        parsed?.kind === "count" ? parsed.count : ing.grams != null ? ing.grams / AVG_EGG_G : null;
      if (baseCount != null && baseCount > 0) {
        const exact = baseCount * factor;
        const rounded = Math.max(1, Math.round(exact));
        const noun = parsed?.kind === "count" ? parsed.noun : "large egg";
        out.householdMeasure = `${rounded} ${pluralize(noun, rounded)}`;
        if (Math.abs(rounded - exact) / exact > 0.15) {
          const g = roundGrams(exact * AVG_EGG_G);
          out.notes = appendNote(
            ing.notes,
            `scaled amount is ≈${exact.toFixed(1)} eggs — whisk and weigh ${g} g for accuracy`,
          );
        }
        return out;
      }
    }

    if (!parsed) {
      out.householdMeasure = null;
    } else if (parsed.kind === "volume") {
      out.householdMeasure = formatVolume(parsed.tsp * factor, parsed.usesCups);
    } else {
      const c = parsed.count * factor;
      out.householdMeasure = `${formatFraction(c)} ${pluralize(parsed.noun, c)}`;
    }
    return out;
  });
}

/** Sum of ingredient weights (grams, falling back to ml ≈ g). Useful for batter estimates. */
export function totalIngredientGrams(ingredients: RecipeIngredient[], group?: string): number {
  return ingredients
    .filter((i) => !group || i.group.toLowerCase() === group.toLowerCase())
    .reduce((sum, i) => sum + (i.grams ?? i.ml ?? 0), 0);
}

/* ────────────────────────────────────────────────────────────
 * Bake time / temperature advice
 * ──────────────────────────────────────────────────────────── */

export interface BakingAdvice {
  tempC: number;
  bakeMinutesMin: number;
  bakeMinutesMax: number;
  warnings: string[];
  approximate: true;
}

/**
 * Approximate bake adjustments when scaling and/or changing pans. Bake time is
 * driven mainly by batter depth; wide pans also need gentler heat so edges
 * don't over-bake before the centre sets.
 */
export function bakingAdjustmentAdvice(
  fromPan: Pan | null | undefined,
  toPan: Pan | null | undefined,
  factor: number,
  baseBakeMin: number,
  baseBakeMax: number,
  ovenTempC: number,
): BakingAdvice {
  const warnings: string[] = [];
  const from = fromPan ?? null;
  const to = toPan ?? from;
  const areaRatio = from && to ? panAreaSqIn(to) / panAreaSqIn(from) : 1;
  const depthRatio = factor / (areaRatio > 0 ? areaRatio : 1);
  const span = to ? panSpanIn(to) : 0;
  const fromSpan = from ? panSpanIn(from) : span;

  // Time grows sub-linearly with depth; width adds a little.
  const widthEffect = fromSpan > 0 && span > 0 ? Math.pow(span / fromSpan, 0.25) : 1;
  const timeMult = Math.pow(Math.max(depthRatio, 0.2), 0.7) * widthEffect;

  let tempC = ovenTempC;
  if (span >= 10 || depthRatio > 1.25) {
    tempC = ovenTempC - 10;
  } else if (span >= 9 || depthRatio > 1.1) {
    tempC = ovenTempC - 5;
  }
  tempC = roundTempC(Math.max(150, tempC));
  const tempDrop = ovenTempC - tempC;
  // Lower temperature lengthens bake slightly
  const tempMult = 1 + Math.max(0, tempDrop) * 0.01;

  const min = Math.max(5, Math.round(baseBakeMin * timeMult * tempMult));
  const max = Math.max(min + 3, Math.round(baseBakeMax * timeMult * tempMult));

  if (Math.abs(factor - 1) > 0.02 || (from && to && from.id !== to.id)) {
    warnings.push("Bake time is an estimate — start checking at the minimum time with a skewer or thermometer (≈ 96–99 °C in the centre).");
  }
  if (tempDrop > 0) {
    warnings.push(`Lowered oven to ${tempC} °C (from ${ovenTempC} °C) so the edges don't over-bake before the centre sets.`);
  }
  if (span >= 10) {
    warnings.push("For pans 10\" and wider, use a heating core or an upturned greased flower nail in the centre, and bake strips around the pan for an even rise.");
  }
  if (depthRatio > 1.3) {
    warnings.push("The batter will be much deeper than the original recipe — consider splitting it between two pans instead.");
  }
  if (depthRatio < 0.75) {
    warnings.push("The batter layer will be thinner than the original — check 5–10 minutes early; thin layers dry out quickly.");
  }
  if (to && to.depthIn > 0 && from && factor > 0) {
    // Rough fill check: original assumed ~2/3 full
    const fill = (2 / 3) * depthRatio * (from.depthIn / to.depthIn);
    if (fill > 0.8) warnings.push("The pan may be more than ~3/4 full — risk of overflow. Use a taller pan or two pans.");
  }
  if (factor >= 1.8) {
    warnings.push("Leavening doesn't always scale perfectly in large batches — mix in batches if your mixer bowl is small, and don't let mixed batter sit.");
  }

  return { tempC, bakeMinutesMin: min, bakeMinutesMax: max, warnings, approximate: true };
}
