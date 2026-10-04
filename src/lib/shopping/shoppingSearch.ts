import "server-only";
import { env, USER_AGENT } from "@/lib/server/env";
import { sharedCache } from "@/lib/server/memoryCache";
import { matchRetailer, type StoreType } from "./retailers";

export interface NearbyStore {
  id: string;
  name: string;
  type: StoreType;
  /** Known chain name if matched against our retailer list */
  chain: string | null;
  address: string | null;
  distanceKm: number | null;
  mapsUrl: string;
  website: string | null;
  openNow: boolean | null;
  provider: "google_places" | "openstreetmap";
}

const cache = sharedCache<NearbyStore[]>("stores", 300);

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10;
}

function classify(name: string, osmShop: string | undefined, countryCode: string | null): { type: StoreType; chain: string | null; website: string | null } | null {
  const retailer = matchRetailer(countryCode, name);
  if (retailer) return { type: retailer.type, chain: retailer.name, website: retailer.website ?? null };
  if (/bak(e|ing)\s?(supply|supplies|ingredients|house|mart|craft|store|shop)|cake (supply|supplies|decorat)/i.test(name))
    return { type: "baking_supply", chain: null, website: null };
  switch (osmShop) {
    case "supermarket":
      return { type: "supermarket", chain: null, website: null };
    case "wholesale":
    case "department_store":
      return { type: "hypermarket", chain: null, website: null };
    case "convenience":
    case "general":
      return { type: "convenience", chain: null, website: null };
    case "confectionery":
    case "pastry":
      return /supply|ingredient/i.test(name) ? { type: "baking_supply", chain: null, website: null } : null;
    case "craft":
      return { type: "craft", chain: null, website: null };
    default:
      return null;
  }
}

/** OpenStreetMap Overpass: supermarkets, convenience, wholesale + anything named like a baking supplier. */
async function overpassStores(lat: number, lon: number, countryCode: string | null, radiusM: number): Promise<NearbyStore[]> {
  const q = `[out:json][timeout:20];
(
  nwr(around:${radiusM},${lat},${lon})["shop"~"^(supermarket|convenience|wholesale|department_store|general|confectionery|pastry|craft)$"];
  nwr(around:${radiusM * 2},${lat},${lon})["name"~"bak(e|ing)|phoon huat|cake suppl",i]["shop"];
);
out center tags 120;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT() },
    body: new URLSearchParams({ data: q }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Overpass returned ${res.status}`);
  const data = (await res.json()) as {
    elements: { id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
  };
  const out: NearbyStore[] = [];
  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags.brand;
    if (!name) continue;
    const c = classify(`${name} ${tags.brand ?? ""}`, tags.shop, countryCode);
    if (!c) continue;
    const pLat = el.lat ?? el.center?.lat;
    const pLon = el.lon ?? el.center?.lon;
    const addr = [tags["addr:housenumber"], tags["addr:street"], tags["addr:postcode"]].filter(Boolean).join(" ") || null;
    out.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      type: c.type,
      chain: c.chain,
      address: addr,
      distanceKm: pLat != null && pLon != null ? haversineKm(lat, lon, pLat, pLon) : null,
      mapsUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      website: tags.website ?? c.website,
      openNow: null,
      provider: "openstreetmap",
    });
  }
  return out;
}

/** Google Places API (New) Text Search — used when GOOGLE_MAPS_API_KEY is configured. */
async function googleStores(lat: number, lon: number, countryCode: string | null, radiusM: number): Promise<NearbyStore[]> {
  const queries = ["supermarket", "baking supplies store"];
  const all: NearbyStore[] = [];
  for (const textQuery of queries) {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.googleMapsKey()!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.websiteUri,places.currentOpeningHours.openNow,places.primaryType",
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 15,
        locationBias: { circle: { center: { latitude: lat, longitude: lon }, radius: Math.min(radiusM * 2, 50000) } },
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Google Places returned ${res.status}`);
    const data = (await res.json()) as {
      places?: {
        id: string;
        displayName?: { text: string };
        formattedAddress?: string;
        location?: { latitude: number; longitude: number };
        googleMapsUri?: string;
        websiteUri?: string;
        primaryType?: string;
        currentOpeningHours?: { openNow?: boolean };
      }[];
    };
    for (const p of data.places ?? []) {
      const name = p.displayName?.text;
      if (!name) continue;
      const shop = p.primaryType === "convenience_store" ? "convenience" : p.primaryType?.includes("supermarket") || p.primaryType === "grocery_store" ? "supermarket" : undefined;
      const c = classify(name, shop ?? (textQuery.includes("baking") ? undefined : "supermarket"), countryCode) ?? (textQuery.includes("baking") ? { type: "baking_supply" as const, chain: null, website: null } : null);
      if (!c) continue;
      all.push({
        id: `g-${p.id}`,
        name,
        type: c.type,
        chain: c.chain,
        address: p.formattedAddress ?? null,
        distanceKm: p.location ? haversineKm(lat, lon, p.location.latitude, p.location.longitude) : null,
        mapsUrl: p.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
        website: p.websiteUri ?? c.website,
        openNow: p.currentOpeningHours?.openNow ?? null,
        provider: "google_places",
      });
    }
  }
  return all;
}

export async function findNearbyStores(lat: number, lon: number, countryCode: string | null): Promise<{ stores: NearbyStore[]; provider: string }> {
  const useGoogle = Boolean(env.googleMapsKey());
  const key = `${useGoogle ? "g" : "o"}:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const provider = useGoogle ? "Google Places" : "OpenStreetMap";
  const hit = cache.get(key);
  if (hit) return { stores: hit, provider };

  let stores = useGoogle ? await googleStores(lat, lon, countryCode, 2500) : await overpassStores(lat, lon, countryCode, 2500);
  if (stores.filter((s) => s.type !== "convenience").length < 3 && !useGoogle) {
    stores = await overpassStores(lat, lon, countryCode, 6000); // widen in sparse areas
  }
  // de-dupe by name+distance, sort by distance, keep a manageable list
  const seen = new Set<string>();
  stores = stores
    .sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
    .filter((s) => {
      const k = `${s.name.toLowerCase()}|${s.distanceKm}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 40);
  cache.set(key, stores, 24 * 60 * 60_000);
  return { stores, provider };
}
