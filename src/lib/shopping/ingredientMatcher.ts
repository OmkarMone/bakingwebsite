import type { StoreType } from "./retailers";

/**
 * Maps ingredients to the store types that *typically* stock them, then plans the
 * fewest stores to visit. Outputs are likelihoods by store type — never verified stock.
 */

export type Likelihood = "likely" | "possible" | "unlikely";

type Category =
  | "pantry_basic" // flour, sugar, salt, oil
  | "dairy_fresh" // milk, butter, eggs, yogurt
  | "baking_common" // baking powder/soda, cocoa, vanilla essence, cornflour, condensed milk
  | "cream" // whipping cream, cream cheese
  | "chocolate" // baking/dark chocolate, chips
  | "baking_specialty" // cake flour, couverture, cream of tartar, gelatin, almond flour, vanilla bean, matcha, glucose
  | "decoration" // gel colours, fondant, sprinkles, piping, boards
  | "produce" // fruit, lemons, carrots
  | "premium_dairy"; // mascarpone, crème fraîche

const RULES: [RegExp, Category][] = [
  [/fondant|gel colou?r|food colou?r|sprinkle|nonpareil|edible|cake board|cake box|piping|nozzle|dowel|topper|lustre|luster|sugar flowers?|candles?/, "decoration"],
  [/mascarpone|cr[eè]me fra[iî]che|clotted/, "premium_dairy"],
  [/cream of tartar|gelatin|gelatine|agar|xanthan|glucose|invert|couverture|vanilla (bean|pod|paste)|matcha|almond (flour|meal)|cake flour|meringue powder|pandan (paste|essence)|freeze[- ]dried|gluten[- ]free (flour|blend)|vegan butter|dutch[- ]process|tylose|cmc|isomalt|rose water|saffron|espresso powder|instant coffee/, "baking_specialty"],
  [/whipping cream|heavy cream|double cream|fresh cream|thickened cream|cream cheese|non[- ]dairy (whipped|topping)|whipped topping|sour cream/, "cream"],
  [/chocolate|cacao nibs|choc chips/, "chocolate"],
  [/baking powder|baking soda|bicarbonate|cocoa|vanilla|corn ?(flour|starch)|condensed milk|evaporated|milk powder|custard powder|icing sugar|powdered sugar|confectioner|brown sugar|caster|golden syrup|maple|honey|vinegar|espresso|coffee|nuts?|almonds?|walnuts?|cashews?|raisins?|coconut/, "baking_common"],
  [/\bmilk\b|butter|eggs?|yog(h)?urt|curd|buttermilk|ghee/, "dairy_fresh"],
  [/lemon|lime|orange|banana|apple|strawberr|blueberr|raspberr|mango|carrot|pineapple|zucchini|berries|fruit|zest|beetroot|pumpkin/, "produce"],
  [/flour|maida|sugar|salt|oil|water|semolina|sooji|rava/, "pantry_basic"],
];

const COVERAGE: Record<StoreType, Record<Category, Likelihood>> = {
  supermarket: { pantry_basic: "likely", dairy_fresh: "likely", baking_common: "likely", cream: "likely", chocolate: "likely", baking_specialty: "possible", decoration: "possible", produce: "likely", premium_dairy: "possible" },
  premium_supermarket: { pantry_basic: "likely", dairy_fresh: "likely", baking_common: "likely", cream: "likely", chocolate: "likely", baking_specialty: "possible", decoration: "possible", produce: "likely", premium_dairy: "likely" },
  hypermarket: { pantry_basic: "likely", dairy_fresh: "likely", baking_common: "likely", cream: "likely", chocolate: "likely", baking_specialty: "possible", decoration: "possible", produce: "likely", premium_dairy: "possible" },
  convenience: { pantry_basic: "possible", dairy_fresh: "possible", baking_common: "unlikely", cream: "unlikely", chocolate: "possible", baking_specialty: "unlikely", decoration: "unlikely", produce: "unlikely", premium_dairy: "unlikely" },
  baking_supply: { pantry_basic: "likely", dairy_fresh: "possible", baking_common: "likely", cream: "likely", chocolate: "likely", baking_specialty: "likely", decoration: "likely", produce: "unlikely", premium_dairy: "possible" },
  online: { pantry_basic: "likely", dairy_fresh: "likely", baking_common: "likely", cream: "likely", chocolate: "likely", baking_specialty: "possible", decoration: "possible", produce: "likely", premium_dairy: "possible" },
  craft: { pantry_basic: "unlikely", dairy_fresh: "unlikely", baking_common: "unlikely", cream: "unlikely", chocolate: "possible", baking_specialty: "possible", decoration: "likely", produce: "unlikely", premium_dairy: "unlikely" },
};

export function categorize(name: string): Category {
  const n = name.toLowerCase();
  return RULES.find(([re]) => re.test(n))?.[1] ?? "baking_common";
}

export function likelihood(storeType: StoreType, ingredientName: string): Likelihood {
  return COVERAGE[storeType][categorize(ingredientName)];
}

export interface PlannableStore {
  id: string;
  name: string;
  type: StoreType;
  distanceKm: number | null;
  /** Matched known retailer chain — preferred over unknown independents */
  chain?: string | null;
}

export interface PlanStop<S extends PlannableStore> {
  store: S;
  items: string[];
  likelihood: Likelihood;
}

export interface ShoppingPlan<S extends PlannableStore> {
  stops: PlanStop<S>[];
  uncovered: string[];
  primaryCoveragePct: number;
  summary: string;
}

/**
 * Greedy set cover: repeatedly pick the store that "likely" stocks the most remaining items
 * (nearest wins ties, distant stores penalised). Then try to place leftovers as "possible".
 */
export function planShopping<S extends PlannableStore>(items: string[], stores: S[], maxStops = 3): ShoppingPlan<S> {
  const unique = [...new Set(items)];
  let remaining = [...unique];
  const stops: PlanStop<S>[] = [];
  const pool = [...stores];

  const distancePenalty = (s: S) => (s.distanceKm == null ? 0.4 : Math.min(1, s.distanceKm / 8)) - (s.chain ? 0.6 : 0);

  for (let round = 0; round < maxStops && remaining.length && pool.length; round++) {
    let best: { s: S; items: string[]; value: number } | null = null;
    for (const s of pool) {
      if (stops.some((st) => st.store.type === s.type && st.store.name === s.name)) continue;
      const covered = remaining.filter((i) => likelihood(s.type, i) === "likely");
      const value = covered.length - distancePenalty(s);
      if (covered.length && (!best || value > best.value)) best = { s, items: covered, value };
    }
    if (!best) break;
    stops.push({ store: best.s, items: best.items, likelihood: "likely" });
    remaining = remaining.filter((i) => !best!.items.includes(i));
    pool.splice(pool.indexOf(best.s), 1);
  }

  // Leftovers: attach to an existing stop if it "possibly" stocks them, else find a store that does
  for (const item of [...remaining]) {
    const existing = stops.find((st) => likelihood(st.store.type, item) === "possible");
    if (existing) {
      existing.items.push(`${item} (may need checking)`);
      remaining = remaining.filter((i) => i !== item);
    }
  }
  if (remaining.length && stops.length < maxStops + 1) {
    const specialist = pool
      .filter((s) => s.type === "baking_supply" || s.type === "craft" || s.type === "online")
      .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
      .find((s) => remaining.some((i) => likelihood(s.type, i) !== "unlikely"));
    if (specialist) {
      const got = remaining.filter((i) => likelihood(specialist.type, i) !== "unlikely");
      stops.push({ store: specialist, items: got, likelihood: "possible" });
      remaining = remaining.filter((i) => !got.includes(i));
    }
  }

  const primaryCoveragePct = unique.length && stops[0] ? Math.round((stops[0].items.length / unique.length) * 100) : 0;
  const summary = stops[0]
    ? `You can likely get about ${primaryCoveragePct}% of the ingredients at ${stops[0].store.name}${
        stops.length > 1 ? `, and the rest from ${stops.slice(1).map((s) => s.store.name).join(" and ")}` : ""
      }.`
    : "We couldn't match these ingredients to nearby stores.";
  return { stops, uncovered: remaining, primaryCoveragePct, summary };
}
