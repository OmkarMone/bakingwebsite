import { NextResponse } from "next/server";
import { assertSameOrigin, enforceRateLimit, handler, parseJson } from "@/lib/server/http";
import { getDb, requireDb } from "@/lib/server/db";
import { currentProfileId, ensureProfileId } from "@/lib/server/session";
import { PreferencesSchema } from "@/lib/preferences";

export const GET = handler(async () => {
  const db = getDb();
  if (!db) return NextResponse.json({ preferences: PreferencesSchema.parse({}), database: false });
  const profileId = await currentProfileId();
  if (!profileId) return NextResponse.json({ preferences: PreferencesSchema.parse({}), database: true });
  const row = await db.profile.findUnique({ where: { id: profileId }, select: { preferences: true } });
  const parsed = PreferencesSchema.safeParse(row?.preferences ?? {});
  return NextResponse.json({ preferences: parsed.success ? parsed.data : PreferencesSchema.parse({}), database: true });
});

export const PUT = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "write");
  const preferences = await parseJson(req, PreferencesSchema);
  requireDb();
  const profileId = await ensureProfileId();
  await requireDb().profile.update({ where: { id: profileId }, data: { preferences } });
  return NextResponse.json({ preferences });
});
