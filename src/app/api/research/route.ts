import { z } from "zod";
import { RequirementsSchema, type ResearchEvent } from "@/lib/types";
import { assertSameOrigin, enforceRateLimit, handler, parseJson } from "@/lib/server/http";
import { runResearch, ResearchError, getCachedResearch, researchKey } from "@/lib/research/recipeResearch";
import { SearchConfigError } from "@/lib/research/search";
import { AiConfigError } from "@/lib/ai/claude";
import { getDb } from "@/lib/server/db";
import { currentProfileId } from "@/lib/server/session";
import { env } from "@/lib/server/env";

export const maxDuration = 300;

const Body = z.object({
  requirements: RequirementsSchema,
  forceRefresh: z.boolean().optional().default(false),
});

/**
 * Runs the research pipeline and streams progress as NDJSON:
 *   {"type":"progress",...}\n ... {"type":"result","data":{...}}\n
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  const { requirements, forceRefresh } = await parseJson(req, Body);

  // Cache hits are free — only rate-limit requests that will actually spend on search + AI
  const willRunFresh = forceRefresh || !(await getCachedResearch(researchKey(requirements)));
  if (willRunFresh) enforceRateLimit(req, "research");

  const profileId = await currentProfileId().catch(() => null);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: ResearchEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          closed = true; // client went away
        }
      };
      try {
        const result = await runResearch(requirements, send, { forceRefresh });
        send({ type: "result", data: result });
        // Record history only for users who already have a profile (never create one here)
        const db = getDb();
        if (profileId && db) {
          await db.recipeHistory
            .create({
              data: {
                profileId,
                researchKey: result.id,
                title: result.recipe.name,
                query: requirements.query || requirements.cakeType,
                source: env.dataSource(),
              },
            })
            .catch((e) => console.warn("[research] history write failed", e));
        }
      } catch (err) {
        if (err instanceof ResearchError) send({ type: "error", message: err.message, code: err.code });
        else if (err instanceof SearchConfigError || err instanceof AiConfigError)
          send({ type: "error", message: err.message, code: "not_configured" });
        else {
          console.error("[research] failed", err);
          send({ type: "error", message: err instanceof Error && err.message.length < 200 ? err.message : "Research failed unexpectedly. Please try again." });
        }
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
});
