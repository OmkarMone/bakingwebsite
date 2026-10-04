import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handler, HttpError, parseJson } from "@/lib/server/http";
import { getDb, requireDb } from "@/lib/server/db";
import { currentProfileId, ensureProfileId } from "@/lib/server/session";
import { getCachedResearch } from "@/lib/research/recipeResearch";
import { env } from "@/lib/server/env";

/** List the current profile's saved recipes. */
export const GET = handler(async () => {
  const db = getDb();
  if (!db) return NextResponse.json({ recipes: [], database: false });
  const profileId = await currentProfileId();
  if (!profileId) return NextResponse.json({ recipes: [], database: true });
  const rows = await db.savedRecipe.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, favorite: true, shareId: true, createdAt: true, data: true },
    take: 200,
  });
  return NextResponse.json({
    database: true,
    recipes: rows.map((r) => {
      const d = r.data as { recipe?: { summary?: string; overview?: { finishedWeightGrams?: number; difficulty?: string } }; confidence?: { level?: string } };
      return {
        id: r.id,
        title: r.title,
        favorite: r.favorite,
        shared: Boolean(r.shareId),
        createdAt: r.createdAt,
        summary: d.recipe?.summary ?? null,
        weightGrams: d.recipe?.overview?.finishedWeightGrams ?? null,
        difficulty: d.recipe?.overview?.difficulty ?? null,
        confidence: d.confidence?.level ?? null,
      };
    }),
  });
});

const SaveBody = z.object({
  researchId: z.string().regex(/^[a-f0-9]{32}$/),
  favorite: z.boolean().optional().default(false),
});

/**
 * Save a recipe. The client sends only the research id — the server loads the result from its
 * own cache, so users can't persist arbitrary/forged recipe data or fake sources.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "write");
  const { researchId, favorite } = await parseJson(req, SaveBody);
  requireDb();
  const result = await getCachedResearch(researchId);
  if (!result) throw new HttpError(404, "This research result has expired — please run the search again before saving.", "expired");
  const profileId = await ensureProfileId();
  const db = requireDb();
  const existing = await db.savedRecipe.findFirst({ where: { profileId, title: result.recipe.name, data: { path: ["id"], equals: researchId } } });
  if (existing) return NextResponse.json({ id: existing.id, alreadySaved: true });
  const row = await db.savedRecipe.create({
    data: { profileId, title: result.recipe.name, data: JSON.parse(JSON.stringify(result)), favorite, source: env.dataSource() },
  });
  return NextResponse.json({ id: row.id }, { status: 201 });
});
