import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handler, parseJson } from "@/lib/server/http";
import { heuristicParse } from "@/lib/requirementParser";

const Body = z.object({ query: z.string().trim().min(3, "Describe the cake you want").max(600) });

/** Free text → structured requirements (deterministic parser, no AI). */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "parse");
  const { query } = await parseJson(req, Body);
  return NextResponse.json({ requirements: heuristicParse(query), method: "heuristic" });
});
