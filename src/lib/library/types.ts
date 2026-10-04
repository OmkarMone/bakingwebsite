import type { APPLIANCES, RecipeIngredient } from "@/lib/types";
import type { FrostingType } from "@/lib/calc/frostingCalculator";
import type { CakeStyle } from "@/lib/calc/cakeCalculator";

/**
 * Curated recipe library — recipes written in our own words, with ratios cross-checked against
 * real published recipes listed in `references` (every reference URL was fetched and verified).
 */

export type Appliance = (typeof APPLIANCES)[number];

export interface Diet {
  eggless: boolean;
  vegan: boolean;
  glutenFree: boolean;
  dairyFree: boolean;
}

/** A real, verified published recipe our version was cross-checked against. */
export interface Reference {
  name: string; // site, e.g. "King Arthur Baking"
  title: string; // the page's recipe title
  url: string; // verified to load and contain schema.org Recipe data
  author: string | null;
  rating: number | null; // as published on the page at verifiedAt
  reviewCount: number | null;
  verifiedAt: string; // ISO date
  /** What we took from it (ratio, technique) — shown to users */
  whatWeTook: string;
}

export interface CuratedCake {
  id: string; // kebab-case, unique
  name: string;
  summary: string; // 2–3 sentences
  cakeType: string; // e.g. "Chocolate cake"
  /** Lower-case flavour/style keywords + synonyms used for matching ("chocolate", "cocoa", "choco") */
  tags: string[];
  /** Base style for calculators (density/bake-time heuristics). Chiffon/genoise → "sponge". */
  style: CakeStyle;
  diet: Diet;
  textureTags: string[]; // e.g. ["moist", "soft", "fudgy"]
  difficulty: "Easy" | "Easy–Intermediate" | "Intermediate" | "Advanced";
  base: {
    /** Approximate baked, UNFROSTED weight of the cake at the quantities below */
    bakedWeightGrams: number;
    servings: number;
    panShape: "round" | "square" | "rect" | "loaf" | "tube" | "bundt";
    panDiameterIn: number | null; // for round/square (side length for square)
    panCount: number;
    panSizeLabel: string; // e.g. "two 8-inch (20 cm) round pans, 2 inch deep"
    ovenTempC: number; // conventional (non-fan)
    bakeMinutesMin: number;
    bakeMinutesMax: number;
    prepMinutes: number;
    coolMinutes: number;
  };
  /** group: "Cake" (or "Soak", "Filling" for components that belong to the cake itself) */
  ingredients: RecipeIngredient[];
  method: { title: string; text: string; why: string | null }[];
  whyItWorks: { topic: string; explanation: string }[];
  keyDecisions: { decision: string; rationale: string }[];
  /** Frosting id from the frosting library that suits this cake best */
  defaultFrostingId: string | null;
  /** Other frosting ids that pair well */
  compatibleFrostingIds: string[];
  decorationSuggestions: string[];
  storage: string;
  /** Appliance-specific guidance; omit appliances the recipe is unsuitable for */
  applianceNotes: Partial<Record<Appliance, string>>;
  /** Honest caveats */
  warnings: string[];
  references: Reference[]; // at least 2
}

export interface CuratedFrosting {
  id: string;
  name: string;
  type: FrostingType; // maps to the frosting calculator's type
  tags: string[]; // e.g. ["ganache", "chocolate", "dark chocolate"]
  diet: Diet;
  /** Ingredients for one batch of `batchGrams` total — scaled to the calculated requirement */
  batchGrams: number;
  ingredients: RecipeIngredient[]; // group: the frosting name, e.g. "Chocolate ganache"
  method: { title: string; text: string; why: string | null }[];
  notes: string; // usage notes (consistency, piping vs coating)
  climateNotes: string | null; // hot/humid climates (e.g. Singapore, India)
  references: Reference[]; // at least 1
}
