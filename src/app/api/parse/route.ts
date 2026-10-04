import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handler, parseJson } from "@/lib/server/http";
import { parseRequirements } from "@/lib/ai/requirementParser";

const Body = z.object({ query: z.string().trim().min(3, "Describe the cake you want").max(600) });

/** Free text → structured requirements (AI when available, deterministic fallback otherwise). */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "parse");
  const { query } = await parseJson(req, Body);
  const { parsed, method } = await parseRequirements(query);
  return NextResponse.json({ requirements: parsed, method });
});
