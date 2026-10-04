import type { CakeRequirements, FinalRecipe, RecipeIngredient } from "@/lib/types";
import { bakingAdjustmentAdvice, scaleIngredients, type Pan } from "@/lib/calc/recipeScaler";
import { calculateFrosting } from "@/lib/calc/frostingCalculator";
import { cToF, inToCm } from "@/lib/calc/units";
import type { CuratedCake, CuratedFrosting } from "./types";
import { FROSTINGS } from "./index";
import { findFrostingForText, satisfiesDiet, wantsNoFrosting } from "./matcher";

/**
 * Deterministically turns a curated cake (+ frosting) into a recipe for the user's requirements:
 * scale to the requested finished weight, choose pan size/count, adjust bake time, size the frosting,
 * apply sweetness preference. No AI involved.
 */

const SERVING_G = 90;
const DIAMETERS = [6, 7, 8, 9, 10, 12];

export interface AssembledRecipe {
  recipe: FinalRecipe;
  frosting: CuratedFrosting | null;
  scaleFactor: number;
  notes: string[];
}

const sum = (ings: RecipeIngredient[]) => ings.reduce((s, i) => s + (i.grams ?? i.ml ?? 0), 0);

function panDepthIn(label: string): number {
  const m = label.match(/(\d(?:\.\d)?)\s?(?:-|\s)?(?:inch|in\b|")\s*(?:deep|tall|high)/i);
  return m ? Number(m[1]) : 2;
}

function makePan(shape: CuratedCake["base"]["panShape"], size: number, depthIn: number): Pan {
  return shape === "square"
    ? { id: `square-${size}`, label: `${size}-inch square`, shape: "square", widthIn: size, lengthIn: size, depthIn }
    : { id: `round-${size}`, label: `${size}-inch round`, shape: "round", diameterIn: size, depthIn };
}

/** Pick pan size + count whose total area best matches the scale factor (keeps batter depth sensible). */
function choosePans(cake: CuratedCake, s: number) {
  const d = cake.base.panDiameterIn!;
  const n = cake.base.panCount;
  let best = { size: d, count: n, ratio: 1, cost: Infinity };
  for (const size of DIAMETERS) {
    for (const count of [n - 1, n, n + 1].filter((c) => c >= 1 && c <= 4)) {
      const ratio = ((size * size) / (d * d)) * (count / n);
      const depthChange = s / ratio; // >1 means deeper batter than the original
      const cost = Math.abs(Math.log(depthChange)) * 3 + Math.abs(count - n) * 0.15 + Math.abs(size - d) * 0.03;
      if (cost < best.cost) best = { size, count, ratio, cost };
    }
  }
  return { ...best, depthChange: s / best.ratio };
}

function frostingGrams(type: CuratedFrosting["type"], shape: CuratedCake["base"]["panShape"], sizeIn: number, count: number, depthIn: number) {
  if (shape === "round" || shape === "square") {
    const layers = count === 1 && depthIn >= 3 ? 2 : count;
    const heightIn = count === 1 ? Math.max(2, depthIn * 0.9) : count * 1.6;
    return calculateFrosting({ type, diameterIn: sizeIn, heightIn, layers, shape: shape === "square" ? "square" : "round", piping: "light" }).grams.total;
  }
  // loaf / bundt / tube / sheet: top + partial sides only — rough estimate
  const full = calculateFrosting({ type, diameterIn: shape === "rect" ? 10.8 : 8, heightIn: 3, layers: 1, piping: "none" }).grams.total;
  return Math.round(full * (shape === "rect" ? 0.8 : 0.5));
}

const DECORATION_IDEAS: Record<string, string[]> = {
  birthday: ["Piped rosettes or shells around the top edge", "Chocolate drip with sprinkles or candles", "Personalised topper with name and age"],
  wedding: ["Smooth semi-naked finish with fresh (food-safe) flowers", "Simple pearl border piping", "Tiered presentation on cake boards with dowels"],
  anniversary: ["Heart-shaped piping or stencil", "Fresh berries and gold leaf accents", "Elegant script message in ganache"],
  kids: ["Bright gel-coloured frosting with rainbow sprinkles", "Candy or cookie toppers", "Simple fondant cut-out shapes"],
  cartoon: ["Printed edible image or character topper (easiest)", "Fondant character figures made a day ahead", "Colour-matched buttercream in character colours"],
  minimalist: ["Smooth finish with a single accent (one flower, a sprig)", "Textured palette-knife strokes", "Neutral tones with a clean top border"],
  floral: ["Russian-tip or petal-tip buttercream flowers", "Pressed edible flowers on the sides", "Crescent arrangement of piped blooms"],
  vintage: ["Lambeth-style over-piping with star and petal tips", "Pastel colours with cherries on top", "Ruffle borders and garlands"],
  bento: ["Small 4-inch lunchbox cake with short message", "Simple doodle piping in one colour", "Pastel base with a tiny border"],
  celebration: ["Gold sprinkles and a drip finish", "Macaron or chocolate-shard topping", "Message plaque in chocolate"],
};

export function chooseFrosting(cake: CuratedCake, req: CakeRequirements): { frosting: CuratedFrosting | null; note: string | null } {
  if (wantsNoFrosting(req.frosting)) return { frosting: null, note: null };
  if (req.frosting) {
    const f = findFrostingForText(req.frosting, req);
    if (f) return { frosting: f, note: null };
  }
  const options = [cake.defaultFrostingId, ...cake.compatibleFrostingIds]
    .map((id) => FROSTINGS.find((f) => f.id === id))
    .filter((f): f is CuratedFrosting => !!f && satisfiesDiet(f.diet, req).length === 0);
  const pick = cake.defaultFrostingId || req.frosting ? options[0] ?? null : null;
  const note =
    req.frosting && pick ? `We couldn't match “${req.frosting}” to a frosting that fits your diet, so we used ${pick.name}.` : req.frosting && !pick ? `We don't have a frosting matching “${req.frosting}” that fits your requirements.` : null;
  return { frosting: pick, note };
}

export function assembleRecipe(cake: CuratedCake, req: CakeRequirements, opts: { frosting?: CuratedFrosting | null } = {}): AssembledRecipe {
  const b = cake.base;
  const notes: string[] = [];
  const warnings: string[] = [...cake.warnings];
  const { frosting, note } = opts.frosting !== undefined ? { frosting: opts.frosting, note: null } : chooseFrosting(cake, req);
  if (note) warnings.push(note);

  const depthIn = panDepthIn(b.panSizeLabel);
  const resizable = (b.panShape === "round" || b.panShape === "square") && b.panDiameterIn != null;

  // ── Target cake weight ─────────────────────────────────────
  const targetFinished = req.weightGrams ?? (req.servings ? req.servings * SERVING_G : null);
  let s = 1;
  let size = b.panDiameterIn ?? 8;
  let count = b.panCount;
  let fG = frosting ? frostingGrams(frosting.type, b.panShape, size, count, depthIn) : 0;
  if (targetFinished) {
    for (let i = 0; i < 2; i++) {
      // Frosting shouldn't dominate: cake is at least 55% of the finished weight
      const cakeTarget = Math.max(targetFinished * 0.55, targetFinished - fG);
      s = cakeTarget / b.bakedWeightGrams;
      if (resizable) {
        const p = choosePans(cake, s);
        size = p.size;
        count = p.count;
      }
      fG = frosting ? frostingGrams(frosting.type, b.panShape, resizable ? size : 8, count, depthIn) : 0;
    }
    s = Math.round(s * 100) / 100;
  }

  // ── Scale ingredients, sweetness ──────────────────────────
  let cakeIngredients = s === 1 ? cake.ingredients : scaleIngredients(cake.ingredients, s);
  if (req.sweetness === "less" || req.sweetness === "extra") {
    const f = req.sweetness === "less" ? 0.85 : 1.1;
    cakeIngredients = cakeIngredients.map((i) =>
      /\bsugar\b|jaggery/i.test(i.name) && !/icing|powdered/i.test(i.name)
        ? { ...scaleIngredients([i], f)[0], notes: [i.notes, req.sweetness === "less" ? "reduced 15% for less sweetness" : "increased 10%"].filter(Boolean).join("; ") }
        : i,
    );
    warnings.push(
      req.sweetness === "less"
        ? "Sugar in the cake is reduced by 15%. Sugar also keeps cakes moist and helps browning, so the crumb will be slightly less tender and may bake a minute or two faster — check early."
        : "Sugar increased by 10%. Expect a slightly more tender, faster-browning cake; tent with foil if the top darkens early.",
    );
  }

  let frostingIngredients: RecipeIngredient[] = [];
  if (frosting) {
    const fs = Math.round((fG / frosting.batchGrams) * 100) / 100;
    frostingIngredients = scaleIngredients(frosting.ingredients, fs);
    if (req.sweetness === "less" && /buttercream|frosting/i.test(frosting.name))
      notes.push("For a less-sweet frosting, a Swiss meringue buttercream or stabilised whipped cream is noticeably less sugary than American buttercream.");
  }

  // ── Pan + bake adjustments ────────────────────────────────
  const fromPan = resizable ? makePan(b.panShape, b.panDiameterIn!, depthIn) : null;
  const toPan = resizable ? makePan(b.panShape, size, depthIn) : null;
  const panChanged = resizable && (size !== b.panDiameterIn || count !== b.panCount);
  const advice =
    s !== 1 || panChanged
      ? bakingAdjustmentAdvice(fromPan, toPan, s, b.bakeMinutesMin, b.bakeMinutesMax, b.ovenTempC)
      : { tempC: b.ovenTempC, bakeMinutesMin: b.bakeMinutesMin, bakeMinutesMax: b.bakeMinutesMax, warnings: [] as string[] };
  warnings.push(...advice.warnings);
  if (!resizable && (s < 0.75 || s > 1.35)) {
    const pans = Math.max(1, Math.round(s));
    warnings.push(
      `This cake is baked in a ${b.panShape} pan. For your size we scaled the batter ×${s.toFixed(2)} — ${s > 1.35 ? `divide it between ${pans} pans of the original size` : "use a smaller pan"} rather than one deeper pan, and check doneness early.`,
    );
  }

  const panSize = panChanged
    ? `${count > 1 ? `${count} × ` : ""}${size}-inch (${Math.round(inToCm(size))} cm) ${b.panShape} pan${count > 1 ? "s" : ""}, ${depthIn} inch deep`
    : b.panSizeLabel;

  // ── Appliance ─────────────────────────────────────────────
  const appliance = req.appliance ?? "oven";
  const applianceNote = cake.applianceNotes[appliance] ?? (appliance === "oven" ? null : undefined);
  if (applianceNote === undefined)
    warnings.push(`We don't have tested ${appliance.replace("_", " ")} guidance for this cake — it is written for a conventional oven.`);

  // ── Method: cake → frosting → assembly ────────────────────
  const method = [...cake.method];
  if (frosting) {
    method.push(...frosting.method.map((m) => ({ ...m, title: `${frosting.name}: ${m.title}` })));
    method.push({
      title: "Assemble",
      text:
        count > 1 || depthIn >= 3
          ? `Level the cooled cake${count > 1 ? " layers" : " and split it into 2 layers"} with a serrated knife. Spread a layer of ${frosting.name.toLowerCase()} between layers, apply a thin crumb coat all over, chill 20–30 minutes until firm, then apply the final coat and decorate.`
          : `Make sure the cake is completely cool, then spread the ${frosting.name.toLowerCase()} over the top (and sides if you like) and decorate.`,
      why: "A chilled crumb coat traps loose crumbs so the final layer stays clean and smooth.",
    });
  }

  const bakedG = Math.round(b.bakedWeightGrams * s);
  const finished = Math.round(bakedG + (frosting ? sum(frostingIngredients) * 0.97 : 0));
  const decoration = [...cake.decorationSuggestions, ...(req.decorationStyle ? DECORATION_IDEAS[req.decorationStyle] ?? [] : [])];
  const references = [...cake.references, ...(frosting?.references ?? [])];

  const recipe: FinalRecipe = {
    name: `${cake.name}${frosting ? ` with ${frosting.name}` : ""}`,
    summary: cake.summary,
    overview: {
      cakeType: cake.cakeType,
      finishedWeightGrams: finished,
      servings: req.servings ?? Math.max(2, Math.round(finished / SERVING_G)),
      difficulty: cake.difficulty,
      prepMinutes: b.prepMinutes + (frosting ? 20 : 0),
      bakeMinutesMin: advice.bakeMinutesMin,
      bakeMinutesMax: advice.bakeMinutesMax,
      totalMinutes: b.prepMinutes + advice.bakeMinutesMax + b.coolMinutes + (frosting ? 45 : 0),
      panSize,
      panDiameterInches: resizable ? size : null,
      panCount: count,
      ovenTempC: advice.tempC,
      ovenTempF: Math.round(cToF(advice.tempC) / 5) * 5,
      applianceNotes: applianceNote ?? cake.applianceNotes.oven ?? null,
      expectedTexture: cake.textureTags.map((t, i) => (i === 0 ? t[0].toUpperCase() + t.slice(1) : t)).join(", "),
    },
    ingredients: [...cakeIngredients, ...frostingIngredients],
    method,
    whyItWorks: cake.whyItWorks,
    frostingNotes: frosting ? [frosting.notes, frosting.climateNotes].filter(Boolean).join(" ") : null,
    decorationSuggestions: [...new Set(decoration)].slice(0, 8),
    storage: cake.storage,
    sourceComparison: references.map((r, i) => ({
      url: r.url,
      role: i === 0 ? ("primary" as const) : ("supporting" as const),
      moistness: "Unknown" as const,
      difficulty: "Unknown" as const,
      whatWeTook: r.whatWeTook,
    })),
    keyDecisions: [
      ...(s !== 1
        ? [{ decision: `Scaled ×${s.toFixed(2)} for ~${targetFinished} g finished`, rationale: `All ingredients scale together to keep the tested ratios; ${panChanged ? `pan changed from the original ${b.panSizeLabel} to ${panSize} so the batter depth stays close to the original` : "same pan size"}. Notes below refer to the original size.` }]
        : []),
    ],
    warnings: [...new Set(warnings)],
  };
  return { recipe, frosting, scaleFactor: s, notes };
}
