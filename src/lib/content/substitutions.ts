import { roundGrams, formatTsp } from "@/lib/calc/units";

/**
 * Ingredient substitution knowledge base. Every substitute explains the
 * chemistry and how much it will change the result, so we never recommend a
 * swap that significantly alters the cake without a warning.
 */

export type DietTag = "eggless" | "vegan" | "dairy_free" | "gluten_free";
export type Impact = "minimal" | "noticeable" | "significant";

export interface Substitute {
  /** Generic instruction with ratio, e.g. "240 ml milk + 1 tbsp lemon juice, rest 10 min" */
  instruction: string;
  ratioNote: string;
  impact: Impact;
  why: string;
  /** Diets this substitute is compatible with */
  dietTags: DietTag[];
  /** Produce a quantity-specific instruction for `amount` g (or ml) of the original */
  scale?: (amount: number) => string;
}

export interface SubstitutionEntry {
  id: string;
  name: string;
  aliases: string[];
  /** Phrases that contain an alias but are NOT this ingredient (e.g. "peanut butter") */
  excludes?: RegExp[];
  substitutes: Substitute[];
  recommendedIndex: number;
  warnings?: string[];
}

const ALL: DietTag[] = ["eggless", "vegan", "dairy_free", "gluten_free"];
const NO_DAIRY_OK: DietTag[] = ["eggless", "gluten_free"]; // contains dairy, no egg, no gluten
const g = (n: number) => `${roundGrams(n)} g`;
const ml = (n: number) => `${roundGrams(n)} ml`;
const tsp = (n: number) => formatTsp(n);
const EGG_G = 50;
const eggs = (grams: number) => Math.max(1, Math.round(grams / EGG_G));

export const SUBSTITUTIONS: SubstitutionEntry[] = [
  {
    id: "buttermilk",
    name: "Buttermilk",
    aliases: ["buttermilk", "cultured buttermilk"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "240 ml milk + 1 tbsp lemon juice, stir and rest 10 minutes",
        ratioNote: "1 tbsp acid per 240 ml milk",
        impact: "minimal",
        why: "Buttermilk's main job is acidity (to react with baking soda) and tenderising. Soured milk supplies the same acid, though it is a little thinner.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a)} milk + ${tsp((a / 240) * 3)} lemon juice, rest 10 minutes`,
      },
      {
        instruction: "240 ml milk + 1 tbsp white vinegar, rest 10 minutes",
        ratioNote: "1 tbsp vinegar per 240 ml milk",
        impact: "minimal",
        why: "Vinegar provides the same acidity as lemon juice with a more neutral flavour.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a)} milk + ${tsp((a / 240) * 3)} white vinegar, rest 10 minutes`,
      },
      {
        instruction: "3 parts plain yogurt + 1 part milk, whisked",
        ratioNote: "¾ yogurt : ¼ milk by volume",
        impact: "minimal",
        why: "Yogurt is acidic and thick; thinning with milk matches buttermilk's consistency and acidity.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a * 0.75)} plain yogurt + ${ml(a * 0.25)} milk, whisked smooth`,
      },
      {
        instruction: "Soy or oat milk + 1 tbsp lemon juice per 240 ml (dairy-free)",
        ratioNote: "1 tbsp acid per 240 ml plant milk",
        impact: "noticeable",
        why: "Soy milk curdles best thanks to its protein; it gives acidity but slightly less richness.",
        dietTags: ALL,
        scale: (a) => `${ml(a)} soy milk + ${tsp((a / 240) * 3)} lemon juice, rest 10 minutes`,
      },
    ],
  },
  {
    id: "egg",
    name: "Eggs",
    aliases: ["egg", "eggs", "whole egg", "whole eggs", "large egg", "large eggs"],
    excludes: [/egg\s*(white|yolk)s?/i, /eggless/i, /egg[-\s]?free/i, /eggplant/i],
    recommendedIndex: 0,
    warnings: [
      "Eggs provide structure, leavening, emulsification and moisture. Replacing more than 2 eggs per recipe can change texture significantly — an eggless-developed recipe is more reliable than substituting into a recipe that depends on eggs.",
      "Whisked-egg sponges (genoise, chiffon, angel food) cannot be made by simple substitution.",
    ],
    substitutes: [
      {
        instruction: "60 g plain yogurt (curd) per egg + ¼ tsp baking soda per 2 eggs",
        ratioNote: "≈ ¼ cup yogurt per egg",
        impact: "noticeable",
        why: "Yogurt adds moisture and protein for binding, and its acidity reacts with baking soda to replace some of the lift eggs give. Works best in chocolate, butter and oil cakes.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(eggs(a) * 60)} plain yogurt + ${tsp(eggs(a) * 0.125)} baking soda (for ${eggs(a)} egg${eggs(a) > 1 ? "s" : ""})`,
      },
      {
        instruction: "45 ml aquafaba (chickpea cooking liquid) per egg, lightly whisked until foamy",
        ratioNote: "3 tbsp per egg",
        impact: "noticeable",
        why: "Aquafaba's proteins and starches foam and set like egg white, giving lift and some structure. Vegan.",
        dietTags: ALL,
        scale: (a) => `${ml(eggs(a) * 45)} aquafaba, whisked until foamy (for ${eggs(a)} egg${eggs(a) > 1 ? "s" : ""})`,
      },
      {
        instruction: "1 tbsp ground flaxseed + 3 tbsp water per egg, rest 10 minutes",
        ratioNote: "1 : 3 flax to water",
        impact: "significant",
        why: "Flax gel binds well but gives no lift and a denser, slightly nutty crumb — best for dense chocolate or spice cakes.",
        dietTags: ALL,
        scale: (a) => `${eggs(a)} tbsp ground flaxseed + ${eggs(a) * 3} tbsp water, rested 10 min`,
      },
      {
        instruction: "60 g sweetened condensed milk per egg, and reduce sugar by ~30 g per egg",
        ratioNote: "≈ 3 tbsp per egg",
        impact: "noticeable",
        why: "Condensed milk's milk proteins and sugar bind and keep the crumb moist; it adds sweetness, so cut the recipe's sugar.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(eggs(a) * 60)} condensed milk and reduce sugar by ${g(eggs(a) * 30)}`,
      },
      {
        instruction: "60 g unsweetened applesauce per egg + ¼ tsp baking powder",
        ratioNote: "¼ cup per egg",
        impact: "significant",
        why: "Pectin binds and adds moisture but makes the cake denser and more fruit-flavoured; extra baking powder compensates for lost lift.",
        dietTags: ALL,
        scale: (a) => `${g(eggs(a) * 60)} applesauce + ${tsp(eggs(a) * 0.25)} baking powder`,
      },
    ],
  },
  {
    id: "egg-white",
    name: "Egg whites",
    aliases: ["egg white", "egg whites"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "30 ml aquafaba per egg white",
        ratioNote: "2 tbsp per white",
        impact: "noticeable",
        why: "Aquafaba whips to stiff peaks like egg white; add ¼ tsp cream of tartar per 100 ml to stabilise. Meringue buttercreams made with it are softer.",
        dietTags: ALL,
        scale: (a) => `${ml((a / 30) * 30)} aquafaba (+ a pinch of cream of tartar)`,
      },
      {
        instruction: "Pasteurised liquid egg whites 1:1 by weight",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same protein, safe for uncooked uses; some brands whip less stiffly.",
        dietTags: ["dairy_free", "gluten_free"],
        scale: (a) => `${g(a)} pasteurised liquid egg whites`,
      },
    ],
  },
  {
    id: "butter",
    name: "Butter",
    aliases: ["butter", "unsalted butter", "salted butter"],
    excludes: [/peanut butter/i, /cocoa butter/i, /nut butter/i, /almond butter/i, /butter\s*milk/i, /buttercream/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Neutral oil at 80% of the butter weight (melted-butter recipes)",
        ratioNote: "100 g butter → 80 g oil",
        impact: "noticeable",
        why: "Butter is ~80% fat and ~16% water. Oil gives a moister, softer cake that stays tender when chilled, but less buttery flavour. Not suitable for creaming-method recipes — oil can't trap air.",
        dietTags: ALL,
        scale: (a) => `${g(a * 0.8)} neutral oil (+ ${ml(a * 0.15)} milk or water to replace butter's water)`,
      },
      {
        instruction: "Plant-based butter block 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Block-style vegan butter has similar fat and water content and creams well. Avoid tub spreads — too much water.",
        dietTags: ALL,
        scale: (a) => `${g(a)} plant-based butter block`,
      },
      {
        instruction: "Baking margarine 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Baking margarines (≥ 80% fat) cream like butter. Flavour is less rich.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(a)} baking margarine (≥ 80% fat)`,
      },
      {
        instruction: "Refined coconut oil at 80% of the butter weight",
        ratioNote: "100 g butter → 80 g coconut oil",
        impact: "noticeable",
        why: "Solid at cool room temperature, so it can be creamed, but it sets hard when chilled — serve cakes at room temperature.",
        dietTags: ALL,
        scale: (a) => `${g(a * 0.8)} refined coconut oil`,
      },
    ],
  },
  {
    id: "oil",
    name: "Vegetable oil",
    aliases: ["oil", "vegetable oil", "neutral oil", "canola oil", "sunflower oil", "rapeseed oil"],
    excludes: [/coconut oil/i, /olive oil/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Any other neutral oil 1:1 (sunflower, canola, rice bran, corn)",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Neutral oils are all ~100% fat with mild flavour, so they behave identically in batter.",
        dietTags: ALL,
        scale: (a) => `${ml(a)} any neutral oil`,
      },
      {
        instruction: "Melted butter at 125% of the oil weight",
        ratioNote: "80 g oil → 100 g butter",
        impact: "noticeable",
        why: "Adds buttery flavour; the cake is slightly drier and firmer when cold because butter solidifies.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(a * 1.25)} melted unsalted butter, cooled`,
      },
      {
        instruction: "Light olive oil 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Light (not extra-virgin) olive oil is neutral enough; extra-virgin works in chocolate or citrus cakes but adds flavour.",
        dietTags: ALL,
        scale: (a) => `${ml(a)} light olive oil`,
      },
      {
        instruction: "Replace up to half the oil with unsweetened applesauce",
        ratioNote: "½ oil : ½ applesauce",
        impact: "significant",
        why: "Lowers fat but makes the crumb gummier and denser — fat is what keeps cake tender.",
        dietTags: ALL,
        scale: (a) => `${ml(a / 2)} oil + ${g(a / 2)} unsweetened applesauce`,
      },
    ],
  },
  {
    id: "cake-flour",
    name: "Cake flour",
    aliases: ["cake flour", "superfine cake flour", "low protein flour", "top flour"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "For every 100 g cake flour: 88 g plain flour + 12 g cornstarch, sifted together twice",
        ratioNote: "88 : 12",
        impact: "minimal",
        why: "Cornstarch dilutes plain flour's protein (≈10–11%) towards cake flour's (≈7–8%), so less gluten forms and the crumb stays fine and tender.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a * 0.88)} plain flour + ${g(a * 0.12)} cornstarch, sifted together twice`,
      },
      {
        instruction: "Plain (all-purpose) flour 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Works, but more gluten gives a slightly sturdier, less delicate crumb. Mix gently.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a)} plain flour (mix gently)`,
      },
    ],
  },
  {
    id: "plain-flour",
    name: "Plain (all-purpose) flour",
    aliases: ["all purpose flour", "all-purpose flour", "plain flour", "maida", "ap flour", "flour"],
    excludes: [/self[-\s]?rais/i, /cake flour/i, /almond flour/i, /gluten[-\s]?free/i, /rice flour/i, /bread flour/i, /corn\s*flour/i, /coconut flour/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Cake flour 1:1 by weight",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Lower protein gives a softer, finer crumb. Very slightly less structure — fine for most cakes.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a)} cake flour`,
      },
      {
        instruction: "Measure-for-measure gluten-free flour blend (with xanthan gum) 1:1",
        ratioNote: "1 : 1 by weight",
        impact: "noticeable",
        why: "Rice/starch blends lack gluten; xanthan gum stands in for its binding. Rest the batter 15–20 minutes to hydrate and expect a slightly more fragile crumb.",
        dietTags: ALL,
        scale: (a) => `${g(a)} gluten-free 1:1 flour blend (with xanthan gum)`,
      },
      {
        instruction: "Bread flour 1:1 — not recommended",
        ratioNote: "1 : 1",
        impact: "significant",
        why: "High protein (12–14%) forms more gluten — the cake will be chewy and tough.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a)} bread flour (expect a tougher crumb)`,
      },
    ],
  },
  {
    id: "self-raising-flour",
    name: "Self-raising flour",
    aliases: ["self raising flour", "self-raising flour", "self rising flour", "self-rising flour"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "For every 100 g: 100 g plain flour + 1 ¼ tsp baking powder + a pinch of salt, whisked well",
        ratioNote: "≈ 5 g baking powder per 100 g flour",
        impact: "minimal",
        why: "Self-raising flour is simply plain flour with baking powder (and sometimes salt) pre-mixed.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a)} plain flour + ${tsp((a / 100) * 1.25)} baking powder + ${tsp((a / 100) * 0.2)} salt`,
      },
    ],
  },
  {
    id: "baking-powder",
    name: "Baking powder",
    aliases: ["baking powder", "double acting baking powder"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Per 1 tsp baking powder: ¼ tsp baking soda + ½ tsp cream of tartar",
        ratioNote: "1 soda : 2 cream of tartar",
        impact: "minimal",
        why: "Baking powder is baking soda pre-mixed with a dry acid. Cream of tartar is that acid. Single-acting, so bake promptly.",
        dietTags: ALL,
        scale: (a) => {
          const t = a / 4; // ≈ 4 g per tsp
          return `${tsp(t * 0.25)} baking soda + ${tsp(t * 0.5)} cream of tartar (bake immediately)`;
        },
      },
      {
        instruction: "Per 1 tsp baking powder: ¼ tsp baking soda and replace 120 ml of the recipe's liquid with buttermilk or yogurt",
        ratioNote: "¼ tsp soda per 1 tsp powder",
        impact: "noticeable",
        why: "The buttermilk/yogurt supplies the acid that the soda needs to release CO₂.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => {
          const t = a / 4;
          return `${tsp(t * 0.25)} baking soda and swap ${ml(t * 120)} of the liquid for buttermilk or yogurt`;
        },
      },
    ],
    warnings: ["Baking powder older than ~6 months may have lost strength: test by adding ½ tsp to hot water — it should fizz vigorously."],
  },
  {
    id: "baking-soda",
    name: "Baking soda",
    aliases: ["baking soda", "bicarbonate of soda", "bicarb", "sodium bicarbonate", "soda bicarbonate", "cooking soda"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Per 1 tsp baking soda: 3 tsp baking powder",
        ratioNote: "1 : 3",
        impact: "noticeable",
        why: "Baking soda is ~3–4× stronger. Baking powder brings its own acid, so the recipe's acidic ingredients (yogurt, cocoa, buttermilk) stay un-neutralised — the cake will be a little tangier, paler and less tender. Chocolate cakes look less dark.",
        dietTags: ALL,
        scale: (a) => `${tsp((a / 5) * 3)} baking powder (cake will be slightly paler and tangier)`,
      },
    ],
    warnings: ["There is no exact substitute — soda also raises pH, which darkens and tenderises the crumb."],
  },
  {
    id: "dutch-cocoa",
    name: "Dutch-process cocoa",
    aliases: ["dutch process cocoa", "dutch-process cocoa", "dutched cocoa", "dutch processed cocoa", "alkalized cocoa", "alkalised cocoa", "dutch cocoa"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Natural cocoa 1:1, and for every 15 g cocoa swap ½ tsp of the baking powder for ⅛ tsp baking soda",
        ratioNote: "1 : 1 + leavening tweak",
        impact: "noticeable",
        why: "Dutch cocoa is alkalised (neutral pH) and is usually paired with baking powder. Natural cocoa is acidic, so a little baking soda neutralises it — otherwise the cake is tangier, paler and may rise less evenly.",
        dietTags: ALL,
        scale: (a) => `${g(a)} natural cocoa; swap ${tsp((a / 15) * 0.5)} baking powder for ${tsp((a / 15) * 0.125)} baking soda`,
      },
      {
        instruction: "Black cocoa: replace up to ⅓ of the Dutch cocoa",
        ratioNote: "max ⅓",
        impact: "noticeable",
        why: "Ultra-alkalised black cocoa gives an Oreo-dark colour but is dry and bitter in larger amounts.",
        dietTags: ALL,
        scale: (a) => `${g(a / 3)} black cocoa + ${g((a * 2) / 3)} Dutch or natural cocoa`,
      },
    ],
  },
  {
    id: "cocoa",
    name: "Cocoa powder (natural)",
    aliases: ["cocoa powder", "cocoa", "unsweetened cocoa", "unsweetened cocoa powder", "natural cocoa", "natural cocoa powder"],
    excludes: [/cocoa butter/i, /hot cocoa/i, /drinking chocolate/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Dutch-process cocoa 1:1 — but if the recipe relies on baking soda only, replace each 1 tsp soda with 2 tsp baking powder",
        ratioNote: "1 : 1 + leavening tweak",
        impact: "noticeable",
        why: "Natural cocoa is acidic and reacts with baking soda. Dutch cocoa is neutral, so soda would have nothing to react with — the cake would taste soapy and rise poorly. Baking powder brings its own acid.",
        dietTags: ALL,
        scale: (a) => `${g(a)} Dutch-process cocoa (and switch soda → baking powder if soda is the only leavener)`,
      },
      {
        instruction: "Unsweetened chocolate: 28 g per 15 g cocoa, and reduce the fat by 1 tbsp",
        ratioNote: "≈ 1.9 : 1",
        impact: "noticeable",
        why: "Chocolate contains cocoa butter, so reduce other fat. Melt and add with the wet ingredients.",
        dietTags: ALL,
        scale: (a) => `${g(a * 1.9)} unsweetened chocolate, melted; reduce oil/butter by ${g((a / 15) * 13)}`,
      },
      {
        instruction: "Drinking chocolate / hot cocoa mix — not recommended",
        ratioNote: "—",
        impact: "significant",
        why: "Mostly sugar and milk powder: weak chocolate flavour and a much sweeter cake.",
        dietTags: ["eggless", "gluten_free"],
      },
    ],
  },
  {
    id: "dark-chocolate",
    name: "Dark chocolate",
    aliases: ["dark chocolate", "semisweet chocolate", "semi-sweet chocolate", "bittersweet chocolate", "couverture", "dark couverture", "chocolate"],
    excludes: [/white chocolate/i, /milk chocolate/i, /chocolate chips?/i, /cocoa/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Dark chocolate chips 1:1 (fine in batter; less ideal for ganache)",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Chips contain stabilisers to hold their shape, so they melt thicker — ganache may be less glossy and set firmer.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(a)} dark chocolate chips`,
      },
      {
        instruction: "Milk chocolate: use 1.5× the weight for ganache; 1:1 in batter (reduce sugar slightly)",
        ratioNote: "1.5 : 1 for ganache",
        impact: "noticeable",
        why: "Milk chocolate has less cocoa solids and more milk/sugar, so ganache needs more chocolate to set; flavour is sweeter and milder.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(a * 1.5)} milk chocolate (for ganache) or ${g(a)} in batter`,
      },
      {
        instruction: "For batter only, per 100 g: 35 g cocoa + 30 g butter + 40 g sugar",
        ratioNote: "35 : 30 : 40",
        impact: "noticeable",
        why: "Recreates cocoa solids, fat and sugar. Works in cake batter, but cannot be used for ganache or decorations.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${g(a * 0.35)} cocoa + ${g(a * 0.3)} butter + ${g(a * 0.4)} sugar (batter only)`,
      },
    ],
    warnings: ["Check vegan or dairy-free labels: many dark chocolates contain milk solids."],
  },
  {
    id: "heavy-cream",
    name: "Heavy / whipping cream",
    aliases: ["heavy cream", "whipping cream", "double cream", "heavy whipping cream", "thickened cream", "fresh cream", "cooking cream"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "In batter or ganache: 75% milk + 25% melted butter by weight",
        ratioNote: "3 : 1",
        impact: "noticeable",
        why: "Recreates cream's ~35% fat. Fine for batter and soft ganache, but it will NOT whip.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${ml(a * 0.75)} whole milk + ${g(a * 0.25)} melted butter (does not whip)`,
      },
      {
        instruction: "For whipping: chilled full-fat coconut cream 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Coconut fat whips when cold. Adds coconut flavour and melts faster at room temperature. Vegan.",
        dietTags: ALL,
        scale: (a) => `${g(a)} chilled coconut cream (solid part)`,
      },
      {
        instruction: "Non-dairy whipping cream (vegetable-fat topping) 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Very stable in warm climates and pipes well, but tastes sweeter and less rich. Check the label for milk derivatives.",
        dietTags: ["eggless", "gluten_free"],
        scale: (a) => `${ml(a)} non-dairy whipping cream`,
      },
    ],
  },
  {
    id: "sour-cream",
    name: "Sour cream",
    aliases: ["sour cream", "soured cream", "crème fraîche", "creme fraiche"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Full-fat Greek yogurt 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Similar thickness and acidity; slightly less fat, so the cake is marginally less rich.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a)} full-fat Greek yogurt`,
      },
      {
        instruction: "Plain yogurt 1:1 (reduce other liquid by 1 tbsp per 120 g)",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same acidity for baking soda; thinner, so trim the liquid slightly.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a)} plain yogurt; reduce other liquid by ${tsp((a / 120) * 3)}`,
      },
      {
        instruction: "Plain coconut or soy yogurt 1:1 (dairy-free)",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Provides moisture and some acidity; less tang. Choose unsweetened.",
        dietTags: ALL,
        scale: (a) => `${g(a)} unsweetened plant-based yogurt`,
      },
    ],
  },
  {
    id: "greek-yogurt",
    name: "Greek yogurt",
    aliases: ["greek yogurt", "greek yoghurt", "hung curd", "strained yogurt"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Strain plain yogurt in a cloth for 2–3 hours (start with ~1.5× the weight)",
        ratioNote: "≈ 1.5 : 1",
        impact: "minimal",
        why: "Straining removes whey to reach the same thickness and protein.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `strain ${g(a * 1.5)} plain yogurt to get ~${g(a)}`,
      },
      {
        instruction: "Sour cream 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Similar thickness and acidity, a little richer.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a)} sour cream`,
      },
    ],
  },
  {
    id: "yogurt",
    name: "Plain yogurt / curd",
    aliases: ["yogurt", "yoghurt", "plain yogurt", "curd", "dahi", "natural yogurt"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Sour cream 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same acidity (so baking soda still reacts) with a little more fat.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a)} sour cream`,
      },
      {
        instruction: "Buttermilk: use the same weight and reduce other liquid by ~25%",
        ratioNote: "1 : 1, less liquid",
        impact: "minimal",
        why: "Equally acidic but thinner — trim the milk/water so the batter isn't runny.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a)} buttermilk; reduce other liquid by ${ml(a * 0.25)}`,
      },
      {
        instruction: "Milk + lemon juice: 120 ml milk + 2 tsp lemon juice per 120 g yogurt, reduce other liquid slightly",
        ratioNote: "acidified milk",
        impact: "noticeable",
        why: "Provides acidity for the soda but none of yogurt's thickness — in eggless cakes the crumb may be a little less bound.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a)} milk + ${tsp((a / 120) * 2)} lemon juice`,
      },
      {
        instruction: "Unsweetened soy or coconut yogurt 1:1 (dairy-free / vegan)",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Similar moisture; soy yogurt binds best. Add ½ tsp vinegar per 120 g if it isn't tangy, so baking soda still reacts.",
        dietTags: ALL,
        scale: (a) => `${g(a)} unsweetened soy yogurt + ${tsp((a / 120) * 0.5)} vinegar`,
      },
    ],
  },
  {
    id: "milk",
    name: "Milk",
    aliases: ["milk", "whole milk", "full cream milk", "full-fat milk"],
    excludes: [/butter\s*milk/i, /condensed/i, /evaporated/i, /coconut milk/i, /milk powder/i, /milk chocolate/i, /almond milk/i, /soy milk/i, /oat milk/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Unsweetened soy or oat milk 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Soy milk is closest in protein, so browning and structure are similar. Oat milk is creamier but browns faster.",
        dietTags: ALL,
        scale: (a) => `${ml(a)} unsweetened soy or oat milk`,
      },
      {
        instruction: "Evaporated milk + water, half and half",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Reconstitutes to roughly whole milk.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a / 2)} evaporated milk + ${ml(a / 2)} water`,
      },
      {
        instruction: "Milk powder: 13 g per 100 ml water",
        ratioNote: "13 g per 100 ml",
        impact: "minimal",
        why: "Reconstituted milk powder behaves just like fresh milk.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a * 0.13)} milk powder + ${ml(a)} water`,
      },
      {
        instruction: "Water 1:1 — last resort",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Loses milk proteins and sugars: paler, slightly less tender and less flavourful cake. Fine in chocolate cakes.",
        dietTags: ALL,
        scale: (a) => `${ml(a)} water (cake will be paler)`,
      },
    ],
  },
  {
    id: "condensed-milk",
    name: "Sweetened condensed milk",
    aliases: ["condensed milk", "sweetened condensed milk", "milkmaid"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Homemade, per 100 g: 40 g milk powder + 40 g sugar + 8 g butter + 25 ml hot water, blended",
        ratioNote: "40 : 40 : 8 : 25",
        impact: "minimal",
        why: "Recreates condensed milk's milk solids, sugar and thickness.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a * 0.4)} milk powder + ${g(a * 0.4)} sugar + ${g(a * 0.08)} butter + ${ml(a * 0.25)} hot water, blended smooth`,
      },
      {
        instruction: "Sweetened condensed coconut milk 1:1 (vegan)",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Same sweetness and thickness with coconut flavour.",
        dietTags: ALL,
        scale: (a) => `${g(a)} condensed coconut milk`,
      },
    ],
  },
  {
    id: "evaporated-milk",
    name: "Evaporated milk",
    aliases: ["evaporated milk"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Simmer 2.25× the amount of whole milk until reduced to the required amount",
        ratioNote: "reduce by ~55%",
        impact: "minimal",
        why: "Evaporated milk is milk with ~60% of the water removed.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `simmer ${ml(a * 2.25)} whole milk down to ${ml(a)}`,
      },
      {
        instruction: "Light cream or half-and-half 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Similar richness; slightly more fat.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a)} light cream`,
      },
    ],
  },
  {
    id: "brown-sugar",
    name: "Brown sugar",
    aliases: ["brown sugar", "light brown sugar", "dark brown sugar", "soft brown sugar", "muscovado"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Per 100 g: 93 g white sugar + 7 g molasses (use 13 g for dark brown)",
        ratioNote: "93 : 7",
        impact: "minimal",
        why: "Brown sugar is white sugar coated in molasses, which adds moisture, flavour and a little acidity.",
        dietTags: ALL,
        scale: (a) => `${g(a * 0.93)} white sugar + ${g(a * 0.07)} molasses`,
      },
      {
        instruction: "White sugar 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Cake will be slightly less moist and caramel-flavoured; molasses' acidity also helps baking soda, so rise can be a little lower.",
        dietTags: ALL,
        scale: (a) => `${g(a)} white sugar`,
      },
      {
        instruction: "Coconut sugar 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Similar caramel flavour but drier and slightly less sweet.",
        dietTags: ALL,
        scale: (a) => `${g(a)} coconut sugar`,
      },
    ],
  },
  {
    id: "caster-sugar",
    name: "Caster (superfine) sugar",
    aliases: ["caster sugar", "castor sugar", "superfine sugar", "fine sugar"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Granulated sugar pulsed 30–60 seconds in a blender, 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same sugar, just finer crystals — they dissolve faster and cream more air into butter.",
        dietTags: ALL,
        scale: (a) => `${g(a)} granulated sugar, pulsed fine in a blender`,
      },
      {
        instruction: "Granulated sugar 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Works in most cakes; creaming takes a little longer and meringues may be grainy.",
        dietTags: ALL,
        scale: (a) => `${g(a)} granulated sugar`,
      },
    ],
  },
  {
    id: "icing-sugar",
    name: "Icing (powdered) sugar",
    aliases: ["icing sugar", "powdered sugar", "confectioners sugar", "confectioners' sugar", "confectioner's sugar"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Per 100 g: 97 g granulated sugar + 3 g cornstarch, blended to a fine powder",
        ratioNote: "97 : 3",
        impact: "minimal",
        why: "Commercial icing sugar is ground sugar with a little starch to prevent caking. Blend until no grit remains, then sift.",
        dietTags: ALL,
        scale: (a) => `${g(a * 0.97)} granulated sugar + ${g(a * 0.03)} cornstarch, blended very fine and sifted`,
      },
    ],
    warnings: ["Granulated sugar cannot be swapped directly into frostings — it stays gritty."],
  },
  {
    id: "granulated-sugar",
    name: "Sugar (granulated)",
    aliases: ["sugar", "granulated sugar", "white sugar", "regular sugar"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Caster sugar 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same sugar, finer — creams faster.",
        dietTags: ALL,
        scale: (a) => `${g(a)} caster sugar`,
      },
      {
        instruction: "Light brown sugar 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Moister, slightly denser, caramel-flavoured cake; its acidity makes baking soda react a bit more.",
        dietTags: ALL,
        scale: (a) => `${g(a)} light brown sugar`,
      },
      {
        instruction: "Reduce sugar by up to 20% for a less sweet cake",
        ratioNote: "max −20%",
        impact: "noticeable",
        why: "Sugar also keeps cake moist and tender (it holds water and slows gluten). Cutting more than ~20% makes it drier and tougher.",
        dietTags: ALL,
        scale: (a) => `${g(a * 0.8)} sugar (20% less)`,
      },
    ],
  },
  {
    id: "honey",
    name: "Honey",
    aliases: ["honey"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Maple syrup or golden syrup 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Liquid sugars with similar sweetness and moisture. Maple syrup is vegan.",
        dietTags: ALL,
        scale: (a) => `${g(a)} maple syrup or golden syrup`,
      },
      {
        instruction: "Per 100 g honey: 125 g sugar + 25 ml extra liquid",
        ratioNote: "1.25 : 1 + liquid",
        impact: "noticeable",
        why: "Honey is ~80% sugar and ~17% water and is sweeter than sugar. Its acidity helps baking soda — with plain sugar, the cake may brown less.",
        dietTags: ALL,
        scale: (a) => `${g(a * 1.25)} sugar + ${ml(a * 0.25)} extra liquid`,
      },
    ],
  },
  {
    id: "vanilla",
    name: "Vanilla extract",
    aliases: ["vanilla extract", "vanilla essence", "vanilla", "pure vanilla extract"],
    excludes: [/vanilla (bean|pod) paste/i],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Vanilla bean paste 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same flavour compounds plus visible seeds.",
        dietTags: ALL,
        scale: (a) => `${tsp(a / 4.2)} vanilla bean paste`,
      },
      {
        instruction: "Seeds of ½ vanilla pod per 1 tsp extract",
        ratioNote: "½ pod per tsp",
        impact: "minimal",
        why: "Fresh vanilla is more aromatic; steep the empty pod in the milk for extra flavour.",
        dietTags: ALL,
      },
      {
        instruction: "Omit, or use ½ tsp almond extract / citrus zest for a different flavour",
        ratioNote: "—",
        impact: "noticeable",
        why: "Vanilla is flavour only — leaving it out won't affect structure, but the cake tastes flatter.",
        dietTags: ALL,
      },
    ],
  },
  {
    id: "cornstarch",
    name: "Cornstarch (cornflour)",
    aliases: ["cornstarch", "corn starch", "cornflour", "corn flour"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Potato starch or arrowroot 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Pure starches tenderise cake and thicken fillings the same way.",
        dietTags: ALL,
        scale: (a) => `${g(a)} potato starch or arrowroot`,
      },
      {
        instruction: "Plain flour at 2× the weight (for thickening only)",
        ratioNote: "2 : 1",
        impact: "noticeable",
        why: "Flour is only ~75% starch and contains protein — cloudier fillings, and it doesn't tenderise cake. Not gluten-free.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a * 2)} plain flour (thickening only)`,
      },
    ],
  },
  {
    id: "cream-cheese",
    name: "Cream cheese",
    aliases: ["cream cheese", "full fat cream cheese", "block cream cheese", "philadelphia"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Mascarpone 1:1 + 1 tsp lemon juice per 225 g",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Richer and softer with less tang; lemon restores some acidity. Frosting will be softer — chill well.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a)} mascarpone + ${tsp(a / 225)} lemon juice`,
      },
      {
        instruction: "Labneh / thick strained Greek yogurt 1:1 (in cheesecake-style batters)",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Tangy and thick but lower fat — frostings made with it are much softer.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a)} labneh`,
      },
      {
        instruction: "Vegan cream cheese 1:1",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Works for frosting if firm block-style; many are softer and need extra icing sugar or chilling.",
        dietTags: ALL,
        scale: (a) => `${g(a)} block-style vegan cream cheese`,
      },
    ],
  },
  {
    id: "mascarpone",
    name: "Mascarpone",
    aliases: ["mascarpone"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Per 100 g: 75 g full-fat cream cheese + 25 g heavy cream, beaten smooth",
        ratioNote: "3 : 1",
        impact: "minimal",
        why: "Cream thins and enriches cream cheese towards mascarpone's fat content and texture; slightly tangier.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${g(a * 0.75)} cream cheese + ${g(a * 0.25)} heavy cream, beaten smooth`,
      },
    ],
  },
  {
    id: "vinegar",
    name: "Vinegar",
    aliases: ["vinegar", "white vinegar", "apple cider vinegar", "cider vinegar", "distilled vinegar"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Lemon juice 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Similar acidity (~5%) to react with baking soda; adds a faint citrus note.",
        dietTags: ALL,
        scale: (a) => `${tsp(a / 5)} lemon juice`,
      },
      {
        instruction: "Any other mild vinegar 1:1 (rice, white wine)",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "The acid is what matters; strongly flavoured vinegars (malt, balsamic) are best avoided.",
        dietTags: ALL,
        scale: (a) => `${tsp(a / 5)} rice or white-wine vinegar`,
      },
    ],
  },
  {
    id: "lemon-juice",
    name: "Lemon juice",
    aliases: ["lemon juice", "lime juice", "fresh lemon juice"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "White vinegar 1:1 (for acidity in batter)",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Supplies the same acid for baking soda or souring milk. Use lemon for flavour where it's a feature.",
        dietTags: ALL,
        scale: (a) => `${tsp(a / 5)} white vinegar`,
      },
      {
        instruction: "Lime juice 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Same acidity; slightly different citrus flavour.",
        dietTags: ALL,
        scale: (a) => `${tsp(a / 5)} lime juice`,
      },
    ],
  },
  {
    id: "gelatin",
    name: "Gelatin",
    aliases: ["gelatin", "gelatine", "gelatin powder", "gelatine leaves"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Agar-agar powder: about ⅓ of the gelatin weight, boiled for 1–2 minutes",
        ratioNote: "≈ 1 : 3",
        impact: "noticeable",
        why: "Agar (seaweed-based, vegetarian) is much stronger and must be boiled to activate. It sets firmer and more brittle, and sets at room temperature — not a perfect match for silky mousses.",
        dietTags: ALL,
        scale: (a) => `${g(Math.max(0.5, a / 3))} agar-agar powder, boiled 1–2 minutes`,
      },
    ],
    warnings: ["Gelatin is animal-derived; use agar for vegetarian/vegan cakes."],
  },
  {
    id: "espresso-powder",
    name: "Espresso powder / instant coffee",
    aliases: ["espresso powder", "instant espresso", "instant coffee", "coffee powder", "instant coffee granules"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Finely ground instant coffee granules 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Slightly milder; in chocolate cake it deepens cocoa flavour without tasting of coffee.",
        dietTags: ALL,
        scale: (a) => `${g(a)} instant coffee, crushed fine`,
      },
      {
        instruction: "Replace some of the recipe's hot water/milk with strong brewed coffee",
        ratioNote: "liquid swap",
        impact: "minimal",
        why: "Same flavour boost; keeps total liquid unchanged.",
        dietTags: ALL,
      },
      {
        instruction: "Omit",
        ratioNote: "—",
        impact: "minimal",
        why: "Flavour only — no structural role.",
        dietTags: ALL,
      },
    ],
  },
  {
    id: "gf-flour",
    name: "Gluten-free flour blend",
    aliases: ["gluten free flour", "gluten-free flour", "gf flour", "gluten free flour blend", "gluten-free flour blend", "1:1 gluten free flour"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "DIY per 100 g: 60 g white rice flour + 25 g potato starch + 15 g tapioca starch + ¼ tsp xanthan gum",
        ratioNote: "60 : 25 : 15",
        impact: "noticeable",
        why: "Rice flour gives bulk, starches give tenderness, xanthan gum mimics gluten's binding. Rest the batter 15–20 minutes to avoid grittiness.",
        dietTags: ALL,
        scale: (a) => `${g(a * 0.6)} white rice flour + ${g(a * 0.25)} potato starch + ${g(a * 0.15)} tapioca starch + ${tsp((a / 100) * 0.25)} xanthan gum`,
      },
    ],
    warnings: ["Using regular wheat flour instead would make the cake unsafe for anyone avoiding gluten."],
  },
  {
    id: "almond-flour",
    name: "Almond flour / ground almonds",
    aliases: ["almond flour", "ground almonds", "almond meal"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Ground hazelnuts or cashews 1:1",
        ratioNote: "1 : 1",
        impact: "minimal",
        why: "Similar fat and protein; flavour changes slightly.",
        dietTags: ALL,
        scale: (a) => `${g(a)} finely ground hazelnuts or cashews`,
      },
      {
        instruction: "Sunflower seed flour 1:1 (nut-free)",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Nut-free alternative. Chlorophyll reacts with baking soda and can turn the crumb green — add 1 tsp lemon juice per 100 g to prevent it.",
        dietTags: ALL,
        scale: (a) => `${g(a)} sunflower seed flour + ${tsp(a / 100)} lemon juice`,
      },
      {
        instruction: "Plain flour at 75% of the weight — not a like-for-like swap",
        ratioNote: "0.75 : 1",
        impact: "significant",
        why: "Wheat flour absorbs far more liquid and forms gluten; texture changes from moist and tender to standard sponge, and the cake is no longer gluten-free.",
        dietTags: ["eggless", "vegan", "dairy_free"],
        scale: (a) => `${g(a * 0.75)} plain flour (texture will change)`,
      },
    ],
  },
  {
    id: "coconut-milk",
    name: "Coconut milk",
    aliases: ["coconut milk", "canned coconut milk"],
    recommendedIndex: 0,
    substitutes: [
      {
        instruction: "Whole milk 1:1 (not dairy-free)",
        ratioNote: "1 : 1",
        impact: "noticeable",
        why: "Less fat and no coconut flavour — the cake will be a little less rich.",
        dietTags: NO_DAIRY_OK,
        scale: (a) => `${ml(a)} whole milk`,
      },
      {
        instruction: "Soy milk + 1 tbsp neutral oil per 240 ml (dairy-free)",
        ratioNote: "+ 1 tbsp oil per 240 ml",
        impact: "noticeable",
        why: "The oil makes up some of coconut milk's fat.",
        dietTags: ALL,
        scale: (a) => `${ml(a)} soy milk + ${tsp((a / 240) * 3)} neutral oil`,
      },
    ],
  },
];

/* ────────────────────────────────────────────────────────────
 * Lookup
 * ──────────────────────────────────────────────────────────── */

export interface SubstitutionOptions {
  grams?: number | null;
  ml?: number | null;
  eggless?: boolean;
  vegan?: boolean;
  dairyFree?: boolean;
  glutenFree?: boolean;
}

export interface SubstituteResult {
  instruction: string;
  /** Quantity-specific instruction when an amount was provided and the substitute supports it */
  scaledInstruction: string | null;
  ratioNote: string;
  impact: Impact;
  why: string;
  dietTags: DietTag[];
  /** False when this substitute conflicts with the user's dietary requirements */
  dietOk: boolean;
  dietConflicts: DietTag[];
}

export interface SubstitutionResult {
  id: string;
  ingredient: string;
  matchedAlias: string;
  substitutes: SubstituteResult[];
  recommendedIndex: number;
  recommended: SubstituteResult | null;
  warnings: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9':\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** All aliases sorted longest-first so specific names win ("buttermilk" over "butter"). */
const ALIAS_INDEX: { alias: string; re: RegExp; entry: SubstitutionEntry }[] = SUBSTITUTIONS.flatMap((entry) =>
  entry.aliases.map((alias) => {
    const a = normalize(alias);
    return { alias: a, re: new RegExp(`(^|\\s)${escapeRe(a)}(?=$|\\s)`), entry };
  }),
).sort((x, y) => y.alias.length - x.alias.length);

/** Find the knowledge-base entry for an ingredient name, or null. */
export function matchSubstitutionEntry(ingredientName: string): { entry: SubstitutionEntry; alias: string } | null {
  const raw = ingredientName ?? "";
  const n = normalize(raw);
  if (!n) return null;
  for (const { alias, re, entry } of ALIAS_INDEX) {
    if (!re.test(n)) continue;
    if (entry.excludes?.some((x) => x.test(raw) || x.test(n))) continue;
    return { entry, alias };
  }
  return null;
}

function requiredDiets(opts: SubstitutionOptions): DietTag[] {
  const d: DietTag[] = [];
  if (opts.vegan) d.push("vegan");
  if (opts.eggless) d.push("eggless");
  if (opts.dairyFree) d.push("dairy_free");
  if (opts.glutenFree) d.push("gluten_free");
  return d;
}

/**
 * Look up substitutes for an ingredient. Returns null if unknown — callers can
 * fall back to an AI suggestion (clearly labelled as such).
 */
export function findSubstitutions(ingredientName: string, opts: SubstitutionOptions = {}): SubstitutionResult | null {
  const match = matchSubstitutionEntry(ingredientName);
  if (!match) return null;
  const { entry, alias } = match;
  const required = requiredDiets(opts);
  // Vegan implies eggless and dairy-free
  const effectiveRequired = new Set<DietTag>(required);
  const amount = opts.grams ?? opts.ml ?? null;

  const substitutes: SubstituteResult[] = entry.substitutes.map((s) => {
    const tags = new Set<DietTag>(s.dietTags);
    if (tags.has("vegan")) {
      tags.add("eggless");
      tags.add("dairy_free");
    }
    const conflicts = [...effectiveRequired].filter((d) => !tags.has(d));
    let scaled: string | null = null;
    if (amount != null && amount > 0 && s.scale) {
      try {
        scaled = s.scale(amount);
      } catch {
        scaled = null;
      }
    }
    return {
      instruction: s.instruction,
      scaledInstruction: scaled,
      ratioNote: s.ratioNote,
      impact: s.impact,
      why: s.why,
      dietTags: s.dietTags,
      dietOk: conflicts.length === 0,
      dietConflicts: conflicts,
    };
  });

  // Recommended: the entry's default if diet-compatible, else the lowest-impact compatible option
  const impactRank: Record<Impact, number> = { minimal: 0, noticeable: 1, significant: 2 };
  let recommendedIndex = entry.recommendedIndex;
  if (!substitutes[recommendedIndex]?.dietOk) {
    const compatible = substitutes
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.dietOk)
      .sort((a, b) => impactRank[a.s.impact] - impactRank[b.s.impact]);
    recommendedIndex = compatible.length ? compatible[0].i : -1;
  }

  const warnings = [...(entry.warnings ?? [])];
  if (recommendedIndex === -1 && required.length) {
    warnings.unshift(
      `None of our standard substitutes for ${entry.name.toLowerCase()} fit your dietary requirements (${required
        .map((d) => d.replace("_", "-"))
        .join(", ")}).`,
    );
  }
  const rec = recommendedIndex >= 0 ? substitutes[recommendedIndex] : null;
  if (rec && rec.impact === "significant") {
    warnings.push("The best available substitute will significantly change the cake — consider buying the original ingredient.");
  }

  return {
    id: entry.id,
    ingredient: entry.name,
    matchedAlias: alias,
    substitutes,
    recommendedIndex,
    recommended: rec,
    warnings,
  };
}
