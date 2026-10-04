import { z } from "zod";

/* ────────────────────────────────────────────────────────────
 * User requirements
 * ──────────────────────────────────────────────────────────── */

export const APPLIANCES = ["oven", "otg", "air_fryer", "microwave", "pressure_cooker"] as const;
export const SWEETNESS = ["less", "regular", "extra"] as const;
export const DECORATION_STYLES = [
  "simple",
  "birthday",
  "wedding",
  "anniversary",
  "kids",
  "cartoon",
  "minimalist",
  "floral",
  "vintage",
  "bento",
  "celebration",
] as const;

const shortText = (max = 120) => z.string().trim().max(max);

export const LocationSchema = z.object({
  /** Human label, e.g. "Tampines, Singapore" or "560123" */
  label: shortText(160),
  /** ISO 3166-1 alpha-2, lower case */
  countryCode: z.string().trim().toLowerCase().length(2).nullable().default(null),
  /** Coordinates only present when the browser explicitly granted permission or the user geocoded an area */
  lat: z.number().min(-90).max(90).nullable().default(null),
  lon: z.number().min(-180).max(180).nullable().default(null),
  precise: z.boolean().default(false),
});
export type UserLocation = z.infer<typeof LocationSchema>;

export const RequirementsSchema = z.object({
  query: shortText(600).default(""),
  cakeType: shortText(80).min(2, "Tell us what cake you want to bake"),
  flavor: shortText(80).nullable().default(null),
  eggless: z.boolean().nullable().default(null),
  dairyFree: z.boolean().nullable().default(null),
  glutenFree: z.boolean().nullable().default(null),
  vegan: z.boolean().nullable().default(null),
  weightGrams: z.number().int().min(150).max(10000).nullable().default(null),
  servings: z.number().int().min(1).max(300).nullable().default(null),
  appliance: z.enum(APPLIANCES).nullable().default(null),
  equipment: z.array(shortText(60)).max(20).default([]),
  availableIngredients: z.array(shortText(60)).max(40).default([]),
  sweetness: z.enum(SWEETNESS).nullable().default(null),
  texture: shortText(80).nullable().default(null),
  frosting: shortText(80).nullable().default(null),
  decorationStyle: z.enum(DECORATION_STYLES).nullable().default(null),
  occasion: shortText(80).nullable().default(null),
  decorationNotes: shortText(300).nullable().default(null),
  budget: shortText(60).nullable().default(null),
  location: LocationSchema.nullable().default(null),
});
export type CakeRequirements = z.infer<typeof RequirementsSchema>;
export type CakeRequirementsInput = z.input<typeof RequirementsSchema>;

/* ────────────────────────────────────────────────────────────
 * Search + extraction
 * ──────────────────────────────────────────────────────────── */

export interface SearchHit {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  provider: string;
  query: string;
}

/** Recipe data extracted from a real webpage's schema.org/Recipe markup. */
export interface ExtractedRecipe {
  url: string;
  domain: string;
  sourceName: string;
  title: string;
  description: string | null;
  author: string | null;
  datePublished: string | null;
  rating: number | null;
  reviewCount: number | null;
  recipeYield: string | null;
  ingredients: string[];
  instructions: string[];
  prepMinutes: number | null;
  cookMinutes: number | null;
  totalMinutes: number | null;
  ovenTempC: number | null;
  panSize: string | null;
  image: string | null;
  keywords: string[];
  category: string | null;
  extractionMethod: "json-ld";
  extractedAt: string;
}

export interface RequirementCheck {
  requirement: string;
  status: "met" | "not_met" | "unknown" | "adaptable";
  note?: string;
}

export interface ScoreBreakdown {
  sourceReliability: number; // 0-20
  userRating: number; // 0-12
  reviewVolume: number; // 0-10
  recipeDetail: number; // 0-10
  ingredientQuality: number; // 0-8
  techniqueQuality: number; // 0-10
  relevance: number; // 0-25
  evidence: number; // 0-5
}

export interface ScoredRecipe extends ExtractedRecipe {
  score: number; // 0-100
  breakdown: ScoreBreakdown;
  relevancePct: number; // 0-100
  checks: RequirementCheck[];
  flags: {
    containsEgg: boolean;
    containsDairy: boolean;
    containsGluten: boolean;
    containsAnimal: boolean;
    usesMetric: boolean;
  };
  reliabilityTier: "trusted" | "established" | "unknown";
  notes: string[];
  /** Role in synthesis: primary/supporting base, or technique reference only (e.g. not eggless) */
  role?: "primary" | "supporting" | "technique_reference" | "not_used";
}

/* ────────────────────────────────────────────────────────────
 * Final synthesized recipe — the schema Claude must produce
 * ──────────────────────────────────────────────────────────── */

export const IngredientSchema = z.object({
  group: z.string().describe('Component this belongs to, e.g. "Cake", "Ganache", "Syrup"'),
  name: z.string().describe("Ingredient name, specific (e.g. 'Unsweetened natural cocoa powder')"),
  grams: z.number().nullable().describe("Weight in grams, if the ingredient is weighable"),
  ml: z.number().nullable().describe("Volume in ml for liquids, else null"),
  householdMeasure: z
    .string()
    .nullable()
    .describe("Spoon/cup equivalent, e.g. '2 tbsp' or '3/4 cup + 1 tbsp'. Small leaveners must use tsp."),
  notes: z.string().nullable().describe("Prep notes: 'room temperature', 'sifted', etc."),
  role: z.string().describe("Short functional role, e.g. 'structure', 'leavening', 'moisture', 'acidity'"),
  shoppingName: z.string().describe("Generic shopping term, e.g. 'cocoa powder', 'plain yogurt'"),
});
export type RecipeIngredient = z.infer<typeof IngredientSchema>;

export const FinalRecipeSchema = z.object({
  name: z.string(),
  summary: z.string().describe("2-3 sentence description of the cake and why it fits the request"),
  overview: z.object({
    cakeType: z.string(),
    finishedWeightGrams: z.number().describe("Approximate finished (baked + frosted) weight"),
    servings: z.number(),
    difficulty: z.enum(["Easy", "Easy–Intermediate", "Intermediate", "Advanced"]),
    prepMinutes: z.number(),
    bakeMinutesMin: z.number(),
    bakeMinutesMax: z.number(),
    totalMinutes: z.number().describe("Includes cooling and frosting time"),
    panSize: z.string().describe("e.g. '8-inch (20 cm) round, at least 3 inch (7.5 cm) tall'"),
    panDiameterInches: z.number().nullable(),
    panCount: z.number(),
    ovenTempC: z.number(),
    ovenTempF: z.number(),
    applianceNotes: z.string().nullable().describe("Adjustments for OTG / air fryer / fan ovens"),
    expectedTexture: z.string(),
  }),
  ingredients: z.array(IngredientSchema),
  method: z.array(
    z.object({
      title: z.string().describe("Short step title"),
      text: z.string().describe("Detailed instruction"),
      why: z.string().nullable().describe("Brief technique rationale when it matters, else null"),
    }),
  ),
  whyItWorks: z.array(z.object({ topic: z.string(), explanation: z.string() })),
  frostingNotes: z.string().nullable(),
  decorationSuggestions: z.array(z.string()),
  storage: z.string(),
  sourceComparison: z.array(
    z.object({
      url: z.string().describe("Must be one of the provided source URLs"),
      role: z.enum(["primary", "supporting", "technique_reference", "not_used"]),
      moistness: z.enum(["Excellent", "Good", "Fair", "Unknown"]),
      difficulty: z.enum(["Easy", "Medium", "Hard", "Unknown"]),
      whatWeTook: z.string().describe("What was adopted from this source (ratio, technique) or why it was not used"),
    }),
  ),
  keyDecisions: z.array(
    z.object({
      decision: z.string(),
      rationale: z.string().describe("Baking-science reason, citing source differences"),
    }),
  ),
  warnings: z.array(z.string()).describe("Honest caveats, e.g. adaptations not tested by any source"),
});
export type FinalRecipe = z.infer<typeof FinalRecipeSchema>;

/* ────────────────────────────────────────────────────────────
 * Research result returned to the client
 * ──────────────────────────────────────────────────────────── */

export interface ValidationIssue {
  level: "error" | "warning" | "info";
  field: string;
  message: string;
}

export interface ResearchConfidence {
  level: "High" | "Medium" | "Low";
  recipesFound: number;
  recipesCompared: number;
  sourcesAnalyzed: number;
  requirementsMatchedPct: number;
  explanation: string;
}

export interface LibraryReference {
  name: string;
  title: string;
  url: string;
  author: string | null;
  rating: number | null;
  reviewCount: number | null;
  verifiedAt: string;
  whatWeTook: string;
}

export interface LibraryMatchInfo {
  cakeId: string;
  frostingId: string | null;
  matchScore: number; // 0–100
  reasons: string[];
  /** true when no library recipe fully matched and this is the closest one */
  closestOnly: boolean;
  scaleFactor: number;
  alternatives: { cakeId: string; name: string; score: number }[];
}

export interface ResearchResult {
  id: string; // cache key
  /** "library": curated recipe from our library. "web": top-ranked published recipes (no library match). */
  kind: "library" | "web";
  requirements: CakeRequirements;
  /** Full recipe — always present for library results; null for web results (we link to the source instead) */
  recipe: FinalRecipe | null;
  library: LibraryMatchInfo | null;
  /** Verified published recipes our library recipe was cross-checked against */
  references: LibraryReference[];
  /** Ranked published recipes from live web research (web results only) */
  sources: ScoredRecipe[];
  rejected: { url: string; domain: string; reason: string }[];
  confidence: ResearchConfidence;
  validation: ValidationIssue[];
  searchProvider: string | null;
  queries: string[];
  researchedAt: string;
  cached: boolean;
}

export type ProgressStep = "requirements" | "library" | "search" | "extract" | "compare" | "validate";

export type ResearchEvent =
  | { type: "progress"; step: ProgressStep; status: "active" | "done" | "skipped"; detail?: string }
  | { type: "result"; data: ResearchResult }
  | { type: "error"; message: string; code?: string };
