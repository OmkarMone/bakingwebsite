import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handler } from "@/lib/server/http";
import { getDb } from "@/lib/server/db";
import { currentProfileId } from "@/lib/server/session";

/** Recipe research history for the current profile. */
export const GET = handler(async () => {
  const db = getDb();
  const profileId = db ? await currentProfileId() : null;
  if (!db || !profileId) return NextResponse.json({ history: [] });
  const rows = await db.recipeHistory.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, researchKey: true, title: true, query: true, createdAt: true },
  });
  return NextResponse.json({ history: rows });
});

export const DELETE = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "write");
  const db = getDb();
  const profileId = db ? await currentProfileId() : null;
  if (db && profileId) await db.recipeHistory.deleteMany({ where: { profileId } });
  return NextResponse.json({ ok: true });
});
