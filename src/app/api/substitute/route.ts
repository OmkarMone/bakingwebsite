import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handler, HttpError, parseJson } from "@/lib/server/http";
import { findSubstitutions } from "@/lib/content/substitutions";

const Body = z.object({
  ingredient: z.string().trim().min(2).max(120),
  grams: z.number().positive().max(5000).nullable().optional(),
  ml: z.number().positive().max(5000).nullable().optional(),
  eggless: z.boolean().nullable().optional(),
  vegan: z.boolean().nullable().optional(),
  dairyFree: z.boolean().nullable().optional(),
  glutenFree: z.boolean().nullable().optional(),
});

/** Substitutions from the curated baking-chemistry knowledge base. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "substitute");
  const b = await parseJson(req, Body);
  const result = findSubstitutions(b.ingredient, {
    grams: b.grams ?? null,
    ml: b.ml ?? null,
    eggless: b.eggless ?? undefined,
    vegan: b.vegan ?? undefined,
    dairyFree: b.dairyFree ?? undefined,
    glutenFree: b.glutenFree ?? undefined,
  });
  if (!result) throw new HttpError(404, `We don't have tested substitutes for “${b.ingredient}” yet — we'd rather say so than guess.`, "unknown_ingredient");
  return NextResponse.json({ source: "knowledge_base", result });
});
