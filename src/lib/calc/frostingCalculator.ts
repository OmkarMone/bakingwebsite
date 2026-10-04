import { roundGrams } from "./units";

/**
 * Frosting calculator — estimates frosting needed for filling, crumb coat,
 * final coat and piping from cake geometry. All results are APPROXIMATE:
 * actual usage varies with technique, spatula work and decoration.
 */

export const FROSTING_TYPES = [
  "buttercream",
  "chocolate_ganache",
  "whipped_cream",
  "cream_cheese",
  "swiss_meringue",
  "italian_meringue",
  "chocolate_frosting",
] as const;
export type FrostingType = (typeof FROSTING_TYPES)[number];

export const FROSTING_LABELS: Record<FrostingType, string> = {
  buttercream: "American buttercream",
  chocolate_ganache: "Chocolate ganache",
  whipped_cream: "Whipped cream",
  cream_cheese: "Cream cheese frosting",
  swiss_meringue: "Swiss meringue buttercream",
  italian_meringue: "Italian meringue buttercream",
  chocolate_frosting: "Chocolate frosting (buttercream)",
};

export type PipingLevel = "none" | "light" | "heavy";

export interface FrostingInput {
  type: FrostingType;
  diameterIn: number;
  /** Total height of the assembled cake */
  heightIn: number;
  layers: number;
  shape?: "round" | "square";
  piping?: PipingLevel;
}

interface FrostingSpec {
  /** g/ml */
  density: number;
  fillingMm: number;
  crumbMm: number;
  finalMm: number;
  /** Ratio recipe — parts by weight */
  recipe: { name: string; parts: number; note?: string }[];
  tips: string[];
}

const SPECS: Record<FrostingType, FrostingSpec> = {
  buttercream: {
    density: 1.05,
    fillingMm: 6,
    crumbMm: 1.5,
    finalMm: 4,
    recipe: [
      { name: "Unsalted butter", parts: 1, note: "softened, ~20 °C" },
      { name: "Icing (powdered) sugar", parts: 2, note: "sifted" },
      { name: "Milk or cream", parts: 0.15 },
      { name: "Vanilla extract", parts: 0.02 },
      { name: "Fine salt", parts: 0.004 },
    ],
    tips: [
      "Beat the butter alone for 3–5 minutes until pale before adding sugar for a lighter texture.",
      "Very sweet — add a pinch more salt or a little cream to balance.",
      "Crusts as it dries, which helps with smooth finishes and piping detail.",
    ],
  },
  chocolate_ganache: {
    density: 1.25,
    fillingMm: 5,
    crumbMm: 1.5,
    finalMm: 4,
    recipe: [
      { name: "Dark chocolate (55–70%)", parts: 2, note: "finely chopped" },
      { name: "Heavy / whipping cream (35%+ fat)", parts: 1, note: "heated until just simmering" },
    ],
    tips: [
      "2:1 dark chocolate to cream sets firm — ideal for coating and sharp edges. Use 1:1 for a soft filling or drip.",
      "Milk or white chocolate needs more chocolate: about 3:1 (white chocolate 3:1 to 4:1 in hot weather).",
      "Let ganache cool to a peanut-butter consistency (several hours at room temperature) before spreading.",
      "In hot, humid climates (e.g. Singapore) ganache is far more stable than buttercream or whipped cream.",
    ],
  },
  whipped_cream: {
    density: 0.45,
    fillingMm: 10,
    crumbMm: 2,
    finalMm: 5,
    recipe: [
      { name: "Heavy / whipping cream (35%+ fat)", parts: 1, note: "very cold" },
      { name: "Icing sugar", parts: 0.1 },
      { name: "Vanilla extract", parts: 0.01 },
      { name: "Stabiliser — mascarpone (or bloomed gelatin ~1 tsp per 250 ml cream)", parts: 0.2, note: "recommended" },
    ],
    tips: [
      "Chill the bowl and whisk; stop at firm peaks — over-whipping turns cream grainy and buttery.",
      "Unstabilised whipped cream weeps within hours. Mascarpone, gelatin or instant pudding mix helps it hold.",
      "In hot, humid climates (e.g. Singapore) whipped cream softens quickly — keep the cake refrigerated and serve straight from the fridge.",
      "Weight stays the same when whipped, but volume roughly doubles.",
    ],
  },
  cream_cheese: {
    density: 1.05,
    fillingMm: 6,
    crumbMm: 1.5,
    finalMm: 4,
    recipe: [
      { name: "Full-fat block cream cheese", parts: 1, note: "cold, straight from the fridge" },
      { name: "Unsalted butter", parts: 0.5, note: "softened" },
      { name: "Icing sugar", parts: 1.6, note: "sifted" },
      { name: "Vanilla extract", parts: 0.02 },
    ],
    tips: [
      "Use block (not tub/spreadable) cream cheese and beat the butter first, then the cold cream cheese briefly — over-beating makes it runny.",
      "Softer than buttercream: not ideal for sharp edges or tall stacked cakes. Chill between coats.",
      "Must be refrigerated; it softens quickly in warm rooms.",
    ],
  },
  swiss_meringue: {
    density: 0.85,
    fillingMm: 6,
    crumbMm: 1.5,
    finalMm: 4,
    recipe: [
      { name: "Egg whites", parts: 1, note: "heated with sugar to 71 °C (160 °F)" },
      { name: "Granulated sugar", parts: 1.5 },
      { name: "Unsalted butter", parts: 2.5, note: "softened, cubed" },
      { name: "Vanilla extract", parts: 0.03 },
      { name: "Fine salt", parts: 0.005 },
    ],
    tips: [
      "Ratios of roughly 1 : 1.5–2 : 2.5–3 (whites : sugar : butter) are common; less sugar makes it less sweet but softer.",
      "If it looks curdled, keep beating — it's too cold. If soupy, chill 10–15 min then beat again.",
      "Silky but butter-based: in hot, humid weather (e.g. Singapore) keep the cake cool and avoid long outdoor display.",
    ],
  },
  italian_meringue: {
    density: 0.8,
    fillingMm: 6,
    crumbMm: 1.5,
    finalMm: 4,
    recipe: [
      { name: "Egg whites", parts: 1 },
      { name: "Granulated sugar", parts: 1.35, note: "cooked with the water to 118–121 °C (soft ball)" },
      { name: "Water", parts: 0.4 },
      { name: "Unsalted butter", parts: 3, note: "softened, cubed" },
      { name: "Vanilla extract", parts: 0.03 },
    ],
    tips: [
      "Stream the hot syrup down the side of the bowl into whipping whites — a thermometer is essential.",
      "Slightly more stable than Swiss meringue buttercream thanks to the cooked syrup.",
      "Still butter-based: keep cool in hot climates.",
    ],
  },
  chocolate_frosting: {
    density: 1.05,
    fillingMm: 6,
    crumbMm: 1.5,
    finalMm: 4,
    recipe: [
      { name: "Unsalted butter", parts: 1, note: "softened" },
      { name: "Icing sugar", parts: 1.6, note: "sifted" },
      { name: "Cocoa powder", parts: 0.4, note: "sifted" },
      { name: "Milk or cream", parts: 0.25 },
      { name: "Vanilla extract", parts: 0.02 },
      { name: "Fine salt", parts: 0.004 },
    ],
    tips: [
      "Dutch-processed cocoa gives a darker, smoother frosting; adding a little melted dark chocolate deepens flavour.",
      "Sift the cocoa — lumps never fully beat out.",
    ],
  },
};

const PIPING_PCT: Record<PipingLevel, number> = { none: 0, light: 0.15, heavy: 0.35 };
const WASTE_PCT = 0.1;
const MM_PER_IN = 25.4;
const ML_PER_IN3 = 16.387;

export interface FrostingResult {
  approximate: true;
  type: FrostingType;
  label: string;
  geometry: { topSqIn: number; sideSqIn: number; fillingSqIn: number; fillingLayers: number };
  grams: { filling: number; crumbCoat: number; finalCoat: number; piping: number; waste: number; total: number };
  recipe: { name: string; grams: number; note?: string }[];
  tips: string[];
}

export function calculateFrosting(input: FrostingInput): FrostingResult {
  const spec = SPECS[input.type];
  const shape = input.shape ?? "round";
  const d = clamp(input.diameterIn, 3, 16);
  const h = clamp(input.heightIn, 1, 12);
  const layers = Math.round(clamp(input.layers, 1, 8));
  const piping = input.piping ?? "light";

  let top: number;
  let side: number;
  let fillingArea: number;
  if (shape === "round") {
    const r = d / 2;
    top = Math.PI * r * r;
    side = Math.PI * d * h;
    // filling is spread slightly inside the edge
    fillingArea = Math.PI * Math.max(0, r - 0.25) ** 2;
  } else {
    top = d * d;
    side = 4 * d * h;
    fillingArea = Math.max(0, d - 0.5) ** 2;
  }
  const fillingLayers = layers - 1;

  const grams = (areaSqIn: number, mm: number) => areaSqIn * (mm / MM_PER_IN) * ML_PER_IN3 * spec.density;

  const filling = grams(fillingArea, spec.fillingMm) * fillingLayers;
  const crumb = grams(top + side, spec.crumbMm);
  const finalCoat = grams(top + side, spec.finalMm);
  const pipingG = (crumb + finalCoat) * PIPING_PCT[piping];
  const subtotal = filling + crumb + finalCoat + pipingG;
  const waste = subtotal * WASTE_PCT;
  const total = subtotal + waste;

  const totalParts = spec.recipe.reduce((s, r) => s + r.parts, 0);
  const recipe = spec.recipe.map((r) => ({
    name: r.name,
    grams: roundGrams((r.parts / totalParts) * total),
    ...(r.note ? { note: r.note } : {}),
  }));

  return {
    approximate: true,
    type: input.type,
    label: FROSTING_LABELS[input.type],
    geometry: {
      topSqIn: round1(top),
      sideSqIn: round1(side),
      fillingSqIn: round1(fillingArea),
      fillingLayers,
    },
    grams: {
      filling: roundGrams(filling),
      crumbCoat: roundGrams(crumb),
      finalCoat: roundGrams(finalCoat),
      piping: roundGrams(pipingG),
      waste: roundGrams(waste),
      total: roundGrams(total),
    },
    recipe,
    tips: spec.tips,
  };
}

/** Map free text (e.g. "chocolate ganache", "SMBC") to a frosting type. */
export function frostingTypeFromText(text: string | null | undefined): FrostingType | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/ganache/.test(t)) return "chocolate_ganache";
  if (/swiss|smbc/.test(t)) return "swiss_meringue";
  if (/italian|imbc/.test(t)) return "italian_meringue";
  if (/cream\s*cheese/.test(t)) return "cream_cheese";
  if (/whipp?ed|whipping|chantilly|fresh cream/.test(t)) return "whipped_cream";
  if (/chocolate/.test(t)) return "chocolate_frosting";
  if (/butter\s*cream|buttercream|frosting|icing/.test(t)) return "buttercream";
  return null;
}

function clamp(n: number, lo: number, hi: number) {
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}
const round1 = (n: number) => Math.round(n * 10) / 10;
