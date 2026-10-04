import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handler, HttpError, parseJson } from "@/lib/server/http";
import { requireDb } from "@/lib/server/db";
import { currentProfileId } from "@/lib/server/session";

async function ownRecipe(id: string) {
  const db = requireDb();
  const profileId = await currentProfileId();
  if (!profileId) throw new HttpError(404, "Recipe not found");
  const row = await db.savedRecipe.findFirst({ where: { id, profileId } });
  if (!row) throw new HttpError(404, "Recipe not found");
  return { db, row };
}

export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/recipes/[id]">) => {
  const { id } = await ctx.params;
  const { row } = await ownRecipe(id);
  return NextResponse.json({ id: row.id, favorite: row.favorite, shareId: row.shareId, createdAt: row.createdAt, result: row.data });
});

const Patch = z.object({ favorite: z.boolean().optional(), share: z.boolean().optional() });

export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/recipes/[id]">) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "write");
  const { id } = await ctx.params;
  const body = await parseJson(req, Patch);
  const { db, row } = await ownRecipe(id);
  const data: { favorite?: boolean; shareId?: string | null } = {};
  if (body.favorite !== undefined) data.favorite = body.favorite;
  if (body.share === true && !row.shareId) data.shareId = randomBytes(12).toString("base64url");
  if (body.share === false) data.shareId = null;
  const updated = await db.savedRecipe.update({ where: { id: row.id }, data });
  return NextResponse.json({ id: updated.id, favorite: updated.favorite, shareId: updated.shareId });
});

export const DELETE = handler(async (req: Request, ctx: RouteContext<"/api/recipes/[id]">) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "write");
  const { id } = await ctx.params;
  const { db, row } = await ownRecipe(id);
  await db.savedRecipe.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
});
