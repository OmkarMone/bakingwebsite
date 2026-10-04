/**
 * Ingredient-line classification for dietary requirements.
 * Isomorphic and dependency-free so it can run in ranking, validation and the UI.
 * Deliberately conservative: when in doubt an ingredient is flagged so the user is warned.
 */

const norm = (s: string) => s.toLowerCase().replace(/[‐-―]/g, "-");

const EGG = /\b(eggs?|egg ?whites?|egg ?yolks?|yolks?|whites? of|meringue powder|albumen)\b/;
const EGG_EXEMPT =
  /\b(eggless|egg[- ]?free|egg replac\w*|egg substitute|flax ?(seed)? ?eggs?|chia ?eggs?|vegan eggs?|no eggs?|without eggs?|aquafaba)\b/;

const DAIRY =
  /\b(butter|buttermilk|milk|cream|cheese|yog(h)?urt|curd|dahi|ghee|whey|casein|lactose|mascarpone|ricotta|khoa|khoya|paneer|condensed|evaporated|kefir|milk ?powder|white chocolate|milk chocolate)\b/;
const DAIRY_EXEMPT =
  /\b(peanut butter|nut butter|almond butter|cashew butter|apple butter|cocoa butter|seed butter|sunflower butter|vegan butter|plant[- ]based|dairy[- ]free|non[- ]dairy|almond milk|soy ?milk|oat ?milk|rice milk|coconut (milk|cream|yog(h)?urt|condensed)|cashew (milk|cream)|soy (yog(h)?urt|cream)|cream of tartar|vegan|coconut oil|creamed coconut|butternut|butterscotch extract)\b/;

const GLUTEN =
  /\b(flour|maida|atta|semolina|sooji|suji|rava|wheat|barley|rye|spelt|farro|bulgur|couscous|graham|digestive|biscuits?|cookie crumbs|breadcrumbs|malt|self[- ]rais(ing|ed)|cake flour|plain flour|all[- ]purpose)\b/;
const GLUTEN_EXEMPT =
  /\b(gluten[- ]free|almond flour|almond meal|coconut flour|rice flour|corn ?flour|cornstarch|corn starch|tapioca|potato (flour|starch)|arrowroot|buckwheat|sorghum|chickpea|besan|gram flour|millet|cassava|teff|amaranth|quinoa flour|oat flour \(gluten[- ]free\)|ragi|jowar|bajra)\b/;

const OTHER_ANIMAL = /\b(honey|gelatin|gelatine|lard|suet|carmine|isinglass)\b/;

export interface DietFlags {
  egg: string[];
  dairy: string[];
  gluten: string[];
  otherAnimal: string[];
}

export function classifyIngredients(lines: string[]): DietFlags {
  const flags: DietFlags = { egg: [], dairy: [], gluten: [], otherAnimal: [] };
  for (const raw of lines) {
    const line = norm(raw);
    if (EGG.test(line) && !EGG_EXEMPT.test(line)) flags.egg.push(raw);
    if (DAIRY.test(line)) {
      // Remove exempt phrases then re-test, so "almond milk and butter" is still caught.
      const stripped = line.replace(new RegExp(DAIRY_EXEMPT.source, "g"), " ");
      if (DAIRY.test(stripped)) flags.dairy.push(raw);
    }
    if (GLUTEN.test(line)) {
      const stripped = line.replace(new RegExp(GLUTEN_EXEMPT.source, "g"), " ");
      if (GLUTEN.test(stripped)) flags.gluten.push(raw);
    }
    if (OTHER_ANIMAL.test(line) && !/\bvegan\b|agar/.test(line)) flags.otherAnimal.push(raw);
  }
  return flags;
}

export interface DietRequirements {
  eggless?: boolean | null;
  dairyFree?: boolean | null;
  glutenFree?: boolean | null;
  vegan?: boolean | null;
}

/** Returns human-readable violations of the requested dietary constraints. */
export function dietViolations(lines: string[], req: DietRequirements): string[] {
  const f = classifyIngredients(lines);
  const out: string[] = [];
  const wantsEggless = req.eggless || req.vegan;
  const wantsDairyFree = req.dairyFree || req.vegan;
  if (wantsEggless && f.egg.length) out.push(`Contains egg: ${f.egg.slice(0, 3).join("; ")}`);
  if (wantsDairyFree && f.dairy.length) out.push(`Contains dairy: ${f.dairy.slice(0, 3).join("; ")}`);
  if (req.glutenFree && f.gluten.length) out.push(`Contains gluten: ${f.gluten.slice(0, 3).join("; ")}`);
  if (req.vegan && f.otherAnimal.length) out.push(`Not vegan: ${f.otherAnimal.slice(0, 3).join("; ")}`);
  return out;
}
