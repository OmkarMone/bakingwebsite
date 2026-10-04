import { NextResponse } from "next/server";
import { env } from "@/lib/server/env";
import { searchConfigured } from "@/lib/research/search";
import { CAKES, FROSTINGS } from "@/lib/library";

/** Which capabilities are configured (booleans only — never key material). */
export async function GET() {
  return NextResponse.json({
    library: { cakes: CAKES.length, frostings: FROSTINGS.length },
    webSearchFallback: searchConfigured(),
    maps: env.googleMapsKey() ? "google" : "openstreetmap",
    database: Boolean(env.databaseUrl()),
  });
}
