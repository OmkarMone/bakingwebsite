import { NextResponse } from "next/server";
import { z } from "zod";
import { assertSameOrigin, enforceRateLimit, handler, HttpError, parseJson } from "@/lib/server/http";
import { geocodeArea, reverseGeocode } from "@/lib/shopping/locationService";

const Body = z.union([
  z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  z.object({ text: z.string().trim().min(2).max(160), countryCode: z.string().length(2).nullable().optional() }),
]);

/** Resolve browser coordinates (with permission) or a postal code/area to a neighbourhood label. */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "geocode");
  const body = await parseJson(req, Body);
  const area = "lat" in body ? await reverseGeocode(body.lat, body.lon) : await geocodeArea(body.text, body.countryCode ?? null);
  if (!area) throw new HttpError(404, "Location not found. Try a postal code or neighbourhood name.", "not_found");
  return NextResponse.json(area);
});
