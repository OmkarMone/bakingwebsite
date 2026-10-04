import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";
import { requireDb, getDb } from "./db";

/**
 * Anonymous profile identity via a signed, httpOnly cookie.
 * The profile row is created lazily on the first write (save / preference) — never on page load.
 */
const COOKIE = "crf_pid";
const ONE_YEAR = 60 * 60 * 24 * 365;

function secret() {
  const s = env.sessionSecret();
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET must be set (16+ chars) in production");
    return "dev-insecure-session-secret";
  }
  return s;
}

const sign = (id: string) => createHmac("sha256", secret()).update(id).digest("base64url");

function verify(value: string | undefined): string | null {
  if (!value) return null;
  const [id, sig] = value.split(".");
  if (!id || !sig || !/^[a-z0-9]{20,40}$/i.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

/** Returns the current profile id if the cookie is valid and the row exists. Never creates. */
export async function currentProfileId(): Promise<string | null> {
  const id = verify((await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  const db = getDb();
  if (!db) return null;
  const row = await db.profile.findUnique({ where: { id }, select: { id: true } });
  return row?.id ?? null;
}

/** Returns the profile id, creating the profile + cookie on first use. */
export async function ensureProfileId(): Promise<string> {
  const existing = await currentProfileId();
  if (existing) return existing;
  const db = requireDb();
  const profile = await db.profile.create({ data: { source: env.dataSource() } });
  (await cookies()).set(COOKIE, `${profile.id}.${sign(profile.id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return profile.id;
}
