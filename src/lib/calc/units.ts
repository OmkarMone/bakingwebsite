/** Isomorphic unit helpers used by the calculators and the scaler. */

/** Round a gram quantity to a baker-friendly precision. */
export function roundGrams(g: number): number {
  if (!Number.isFinite(g) || g <= 0) return 0;
  if (g >= 100) return Math.round(g / 5) * 5;
  if (g >= 10) return Math.round(g);
  return Math.max(0.5, Math.round(g * 2) / 2);
}

/** Round ml the same way as grams. */
export const roundMl = roundGrams;

export function formatGrams(g: number | null | undefined): string {
  if (g == null || !Number.isFinite(g)) return "—";
  const r = roundGrams(g);
  if (r >= 1000) return `${(r / 1000).toFixed(r % 1000 === 0 ? 0 : 2).replace(/\.?0+$/, "")} kg`;
  return `${r} g`;
}

export function formatMl(ml: number | null | undefined): string {
  if (ml == null || !Number.isFinite(ml)) return "—";
  const r = roundMl(ml);
  if (r >= 1000) return `${(r / 1000).toFixed(2).replace(/\.?0+$/, "")} L`;
  return `${r} ml`;
}

const FRACTION_GLYPHS: Record<number, string> = {
  1: "⅛",
  2: "¼",
  3: "⅜",
  4: "½",
  5: "⅝",
  6: "¾",
  7: "⅞",
};

/** Format a number of eighths as a mixed fraction, e.g. 10 → "1 ¼". */
function eighthsToString(eighths: number): string {
  const whole = Math.floor(eighths / 8);
  const rem = eighths % 8;
  if (rem === 0) return `${whole}`;
  return whole > 0 ? `${whole} ${FRACTION_GLYPHS[rem]}` : FRACTION_GLYPHS[rem];
}

/** Format a quantity rounded to the nearest 1/8, e.g. 1.25 → "1 ¼". Returns "0" for ≤ 0. */
export function formatFraction(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const eighths = Math.max(1, Math.round(value * 8));
  return eighthsToString(eighths);
}

export const TSP_PER_TBSP = 3;
export const TBSP_PER_CUP = 16;
export const ML_PER_TSP = 4.93;

/**
 * Format a teaspoon quantity, promoting to tablespoons when ≥ 1 tbsp and the
 * value is a clean multiple. Nearest 1/8 tsp.
 */
export function formatTsp(tsp: number): string {
  if (!Number.isFinite(tsp) || tsp <= 0) return "0 tsp";
  if (tsp >= 3) {
    const tbsp = tsp / TSP_PER_TBSP;
    const tbspEighths = Math.round(tbsp * 8);
    // Only use tbsp when it lands on a quarter tbsp, else stay in tsp
    if (tbspEighths % 2 === 0) return `${eighthsToString(tbspEighths)} tbsp`;
  }
  return `${formatFraction(tsp)} tsp`;
}

export const cToF = (c: number) => Math.round((c * 9) / 5 + 32);
export const fToC = (f: number) => Math.round(((f - 32) * 5) / 9);
export const inToCm = (inch: number) => Math.round(inch * 2.54 * 10) / 10;
export const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;

/** Round oven temperature to the nearest 5 °C. */
export const roundTempC = (c: number) => Math.round(c / 5) * 5;
