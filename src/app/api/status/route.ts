import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";

/** Which capabilities are configured (booleans only — never key material). */
export async function GET() {
  const search = Boolean(env.braveKey() || env.tavilyKey() || env.serpapiKey() || (env.googleCseKey() && env.googleCseId()) || env.anthropicKey());
  return NextResponse.json({
    ai: Boolean(env.anthropicKey()),
    search,
    maps: env.googleMapsKey() ? "google" : "openstreetmap",
    database: Boolean(env.databaseUrl()),
  });
}
