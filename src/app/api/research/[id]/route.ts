import { NextResponse } from "next/server";
import { handler, HttpError } from "@/lib/server/http";
import { getCachedResearch } from "@/lib/research/recipeResearch";

/** Fetch a cached research result by id (used to reopen recent results). */
export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/research/[id]">) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{32}$/.test(id)) throw new HttpError(400, "Invalid id");
  const result = await getCachedResearch(id);
  if (!result) throw new HttpError(404, "This research result has expired. Run the search again for fresh results.", "expired");
  return NextResponse.json({ ...result, cached: true });
});
