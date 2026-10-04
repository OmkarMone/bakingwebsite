import { NextResponse } from "next/server";
import { z } from "zod";
import { LocationSchema } from "@/lib/types";
import { assertSameOrigin, enforceRateLimit, handler, HttpError, parseJson } from "@/lib/server/http";
import { geocodeArea } from "@/lib/shopping/locationService";
import { findNearbyStores, type NearbyStore } from "@/lib/shopping/shoppingSearch";
import { likelihood, planShopping, categorize } from "@/lib/shopping/ingredientMatcher";
import { onlineRetailers, STORE_TYPE_LABEL } from "@/lib/shopping/retailers";

const Body = z.object({
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        shoppingName: z.string().trim().min(1).max(80),
        quantity: z.string().trim().max(60).default(""),
      }),
    )
    .min(1)
    .max(60),
  location: LocationSchema,
});

/**
 * Nearby stores + per-ingredient options + the fewest-stores plan.
 * Availability is by store type only and always labelled unverified; prices are never shown
 * because no price API is connected.
 */
export const POST = handler(async (req: Request) => {
  assertSameOrigin(req);
  enforceRateLimit(req, "shopping");
  const { ingredients, location } = await parseJson(req, Body);

  let lat = location.lat;
  let lon = location.lon;
  let areaLabel = location.label;
  let countryCode = location.countryCode;
  if (lat == null || lon == null) {
    if (!location.label.trim()) throw new HttpError(400, "Enter a postal code or area so we can find nearby stores.");
    const area = await geocodeArea(location.label, countryCode).catch(() => null);
    if (!area) throw new HttpError(404, `We couldn't find "${location.label}". Try a postal code or a nearby neighbourhood.`, "not_found");
    ({ lat, lon } = area);
    areaLabel = area.label;
    countryCode = area.countryCode ?? countryCode;
  }

  let stores: NearbyStore[] = [];
  let provider = "OpenStreetMap";
  let storeError: string | null = null;
  try {
    ({ stores, provider } = await findNearbyStores(lat, lon, countryCode));
  } catch (e) {
    console.warn("[shopping] store lookup failed", e);
    storeError = "Live map data is temporarily unavailable — showing known retailers in your country instead.";
  }

  // Shopping items: merge duplicates by shopping name (e.g. sugar in cake + frosting)
  const byItem = new Map<string, { item: string; uses: string[] }>();
  for (const i of ingredients) {
    const key = i.shoppingName.toLowerCase();
    const entry = byItem.get(key) ?? { item: i.shoppingName, uses: [] };
    entry.uses.push(i.quantity ? `${i.quantity} ${i.name}`.trim() : i.name);
    byItem.set(key, entry);
  }
  const items = [...byItem.values()];

  // Candidate stores for planning: nearest of each chain/type + online/baking retailers as fallbacks
  const online = onlineRetailers(countryCode).map((r) => ({
    id: `online-${r.name}`,
    name: r.name,
    type: r.type,
    chain: r.name,
    address: null,
    distanceKm: null,
    mapsUrl: r.website ?? `https://www.google.com/search?q=${encodeURIComponent(r.name)}`,
    website: r.website ?? null,
    openNow: null,
    provider: "openstreetmap" as const,
  }));
  const nearestPerChain = new Map<string, NearbyStore>();
  for (const s of stores) {
    const k = (s.chain ?? s.name).toLowerCase();
    if (!nearestPerChain.has(k)) nearestPerChain.set(k, s);
  }
  const planPool = [...nearestPerChain.values(), ...online.filter((o) => !nearestPerChain.has(o.name.toLowerCase()))];
  const plan = planShopping(items.map((i) => i.item), planPool);

  const perIngredient = items.map(({ item, uses }) => {
    const options = planPool
      .map((s) => ({ store: s.name, type: s.type, distanceKm: s.distanceKm, likelihood: likelihood(s.type, item) }))
      .filter((o) => o.likelihood !== "unlikely")
      .sort((a, b) => (a.likelihood === b.likelihood ? (a.distanceKm ?? 99) - (b.distanceKm ?? 99) : a.likelihood === "likely" ? -1 : 1))
      .slice(0, 4);
    return {
      item,
      uses,
      category: categorize(item),
      options,
      availability: "Availability could not be verified",
      price: "Price not verified",
    };
  });

  return NextResponse.json({
    area: { label: areaLabel, countryCode },
    provider,
    storeError,
    stores: stores.slice(0, 15).map((s) => ({ ...s, typeLabel: STORE_TYPE_LABEL[s.type] })),
    online: online.map((o) => ({ name: o.name, type: o.type, typeLabel: STORE_TYPE_LABEL[o.type], website: o.website })),
    perIngredient,
    plan: {
      ...plan,
      stops: plan.stops.map((s) => ({ ...s, store: { ...s.store, typeLabel: STORE_TYPE_LABEL[s.store.type] } })),
    },
    disclaimer:
      "Store suggestions are based on store type and location data, not live inventory. Availability could not be verified and prices are not shown — please check with the store.",
  });
});
