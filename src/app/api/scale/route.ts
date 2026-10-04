import { NextResponse } from "next/server";
import { z } from "zod";
import { IngredientSchema } from "@/lib/types";
import { assertSameOrigin, handler, HttpError, parseJson } from "@/lib/server/http";
import { bakingAdjustmentAdvice, findPan, scaleFactorForPan, scaleFactorForWeight, scaleIngredients } from "@/lib/calc/recipeScaler";

const Body = z.object({
  ingredients: z.array(IngredientSchema).min(1).max(80),
  factor: z.number().positive().max(20).optional(),
  fromWeightG: z.number().positive().max(20000).optional(),
  toWeightG: z.number().positive().max(20000).optional(),
  fromPanId: z.string().max(40).optional(),
  toPanId: z.string().max(40).optional(),
  baseBakeMin: z.number().positive().max(300).default(30),
  baseBakeMax: z.number().positive().max(300).default(40),
  ovenTempC: z.number().min(100).max(260).default(175),
});

/**
 * Deterministic scaling (same library the UI uses client-side), exposed for API consumers.
 * Scale by explicit factor, by weight, or by pan size.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const b = await parseJson(req, Body, 64_000);
  const fromPan = b.fromPanId ? findPan(b.fromPanId) : undefined;
  const toPan = b.toPanId ? findPan(b.toPanId) : undefined;
  let factor = b.factor;
  if (!factor && b.fromWeightG && b.toWeightG) factor = scaleFactorForWeight(b.fromWeightG, b.toWeightG);
  if (!factor && fromPan && toPan) factor = scaleFactorForPan(fromPan, toPan);
  if (!factor) throw new HttpError(400, "Provide a factor, fromWeightG+toWeightG, or fromPanId+toPanId.");
  return NextResponse.json({
    factor,
    ingredients: scaleIngredients(b.ingredients, factor),
    baking: bakingAdjustmentAdvice(fromPan, toPan, factor, b.baseBakeMin, b.baseBakeMax, b.ovenTempC),
  });
});
